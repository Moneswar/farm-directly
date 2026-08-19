import { Response } from 'express';
import { db } from '../services/storage.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { IDemandForecast, IHubTransfer, IReplenishmentRequest } from '../models/index.js';
import { createNotification } from './notificationController.js';

/**
 * Generate AI Demand Forecasts for all Hub x Product combinations
 */
export function calculateDemandForecasts(forecastPeriod: '7_days' | '14_days' | '30_days' = '7_days'): IDemandForecast[] {
  const periodDays = forecastPeriod === '30_days' ? 30 : forecastPeriod === '14_days' ? 14 : 7;
  const hubs = db.hubs || [];
  const products = db.products || [];
  const orders = (db.orders || []).filter((o) => o.orderStatus !== 'Cancelled');
  const inventoryList = db.inventory || [];
  const collectionsList = db.collections || [];
  const transfersList = db.transfers || [];

  const forecasts: IDemandForecast[] = [];

  // Helper map for fast inventory lookup: `hubId_productId` -> available qty
  const inventoryStockMap: Record<string, number> = {};
  inventoryList.forEach((inv) => {
    const key = `${inv.hubId}_${inv.productId}`;
    inventoryStockMap[key] = (inventoryStockMap[key] || 0) + (inv.quantityAvailable || 0);
  });

  // Calculate global sales volume per product to use as baseline fallback
  const globalProductSales: Record<string, { retail: number; wholesale: number; total: number; orderCount: number }> = {};
  orders.forEach((ord) => {
    (ord.items || []).forEach((item) => {
      if (!globalProductSales[item.productId]) {
        globalProductSales[item.productId] = { retail: 0, wholesale: 0, total: 0, orderCount: 0 };
      }
      const qty = item.quantity || 1;
      const isWholesale = ord.orderType === 'wholesale' || ord.buyerRole === 'shopkeeper';
      if (isWholesale) {
        globalProductSales[item.productId].wholesale += qty;
      } else {
        globalProductSales[item.productId].retail += qty;
      }
      globalProductSales[item.productId].total += qty;
      globalProductSales[item.productId].orderCount += 1;
    });
  });

  // Pre-calculate 7-day predicted demand for each hub x product for surplus checks
  const raw7DayHubDemand: Record<string, number> = {};
  hubs.forEach((hub) => {
    products.forEach((prod) => {
      const matchedItemQty = orders.reduce((acc, ord) => {
        const ordHub = ord.hubId || ord.deliveryHubId;
        if (ordHub === hub.id) {
          const match = (ord.items || []).find((i) => i.productId === prod.id);
          if (match) acc += match.quantity || 1;
        }
        return acc;
      }, 0);
      raw7DayHubDemand[`${hub.id}_${prod.id}`] = Math.max(20, Math.ceil(matchedItemQty * 0.5));
    });
  });

  // Unique product list (deduplicated by product id)
  const uniqueProducts = Array.from(new Map(products.map((p) => [p.id, p])).values());

  hubs.forEach((hub) => {
    uniqueProducts.forEach((product) => {
      // Filter valid orders matching this hub & product
      const hubOrders = orders.filter((ord) => {
        const ordHub = ord.hubId || ord.deliveryHubId;
        return ordHub === hub.id && (ord.items || []).some((i) => i.productId === product.id);
      });

      let retailQty = 0;
      let wholesaleQty = 0;
      let orderCount = 0;
      const datesSet = new Set<string>();

      hubOrders.forEach((ord) => {
        (ord.items || []).forEach((item) => {
          if (item.productId === product.id) {
            const qty = item.quantity || 1;
            const isWholesale = ord.orderType === 'wholesale' || ord.buyerRole === 'shopkeeper';
            if (isWholesale) {
              wholesaleQty += qty;
            } else {
              retailQty += qty;
            }
            orderCount++;
            if (ord.placedAt) {
              datesSet.add(ord.placedAt.split('T')[0]);
            }
          }
        });
      });

      const spanDays = Math.max(1, datesSet.size);
      let dataQualityStatus: 'Sufficient Data' | 'Limited Data' | 'Insufficient Historical Data' = 'Sufficient Data';
      let confidence: 'High' | 'Medium' | 'Low' = 'High';
      let confidenceScore = 0.85;

      let dailyRetailRate = 0;
      let dailyWholesaleRate = 0;

      if (orderCount >= 3 && spanDays >= 2) {
        dataQualityStatus = 'Sufficient Data';
        dailyRetailRate = retailQty / spanDays;
        dailyWholesaleRate = wholesaleQty / spanDays;
        confidenceScore = Math.min(0.95, 0.65 + orderCount * 0.04);
        confidence = confidenceScore >= 0.75 ? 'High' : 'Medium';
      } else if (orderCount >= 1) {
        dataQualityStatus = 'Limited Data';
        dailyRetailRate = retailQty / Math.max(7, spanDays);
        dailyWholesaleRate = wholesaleQty / Math.max(7, spanDays);
        confidenceScore = 0.55;
        confidence = 'Medium';
      } else {
        // Fallback baseline for products with insufficient hub-specific historical data
        dataQualityStatus = 'Insufficient Historical Data';
        confidenceScore = 0.30;
        confidence = 'Low';

        const globalData = globalProductSales[product.id];
        if (globalData && globalData.total > 0) {
          // Distribute global demand across hubs proportionally
          const hubShare = 1 / Math.max(1, hubs.length);
          dailyRetailRate = (globalData.retail / 14) * hubShare;
          dailyWholesaleRate = (globalData.wholesale / 14) * hubShare;
        } else {
          // Default baseline for new products
          dailyRetailRate = product.category === 'Vegetables' || product.category === 'Leafy Greens' ? 12 : 8;
          dailyWholesaleRate = product.category === 'Vegetables' ? 25 : 0;
        }
      }

      // Predicted demand for forecast period
      const retailDemand = Math.ceil(dailyRetailRate * periodDays);
      const wholesaleDemand = Math.ceil(dailyWholesaleRate * periodDays);
      const predictedQuantity = retailDemand + wholesaleDemand;

      // Stock Forecast Calculations
      const stockKey = `${hub.id}_${product.id}`;
      const currentStock = inventoryStockMap[stockKey] || 0;

      // Confirmed Incoming Stock (In-transit farmer collections & dispatched/in-transit transfers)
      const confirmedCollections = collectionsList
        .filter((c) => c.hubId === hub.id && c.productId === product.id && ['In Transit', 'Arrived at Hub'].includes(c.status))
        .reduce((sum, c) => sum + (c.receivedQuantity || c.expectedQuantity || 0), 0);

      const confirmedTransfers = transfersList
        .filter((t) => t.destinationHubId === hub.id && ['In Transit', 'Dispatched'].includes(t.status))
        .reduce((sum, t) => {
          const item = (t.items || []).find((i) => i.productId === product.id);
          return sum + (item ? item.quantity : 0);
        }, 0);

      const confirmedIncoming = confirmedCollections + confirmedTransfers;

      const expectedRemaining = currentStock + confirmedIncoming - predictedQuantity;
      const predictedShortage = Math.max(0, -expectedRemaining);

      // Configurable Safety Stock (20% of predicted demand)
      const safetyStock = Math.ceil(predictedQuantity * 0.20);
      const targetStock = predictedQuantity + safetyStock;

      const recommendedReplenishment = Math.max(0, targetStock - (currentStock + confirmedIncoming));

      // Estimated days until stockout
      const totalDailyRate = (retailDemand + wholesaleDemand) / periodDays;
      let stockoutDays: number | undefined = undefined;
      if (totalDailyRate > 0 && currentStock + confirmedIncoming < predictedQuantity) {
        stockoutDays = Math.max(1, Math.round((currentStock + confirmedIncoming) / totalDailyRate));
      }

      // Smart Replenishment Source Recommendation (Hub Transfer vs Farmer Supply)
      let recommendationType: 'HUB_TRANSFER' | 'FARMER_SUPPLY' = 'FARMER_SUPPLY';
      let recommendedSourceHubId: string | undefined = undefined;
      let recommendedSourceHubName: string | undefined = undefined;
      let recommendedSourceHubAvailableStock: number | undefined = undefined;

      if (recommendedReplenishment > 0) {
        let bestSourceHub: any = null;
        let maxSurplus = 0;

        hubs.forEach((otherHub) => {
          if (otherHub.id !== hub.id) {
            const otherStockKey = `${otherHub.id}_${product.id}`;
            const otherAvailable = inventoryStockMap[otherStockKey] || 0;
            const otherDemand = raw7DayHubDemand[otherStockKey] || 20;
            const surplus = otherAvailable - otherDemand;

            if (surplus > maxSurplus) {
              maxSurplus = surplus;
              bestSourceHub = otherHub;
            }
          }
        });

        if (bestSourceHub && maxSurplus >= 15) {
          recommendationType = 'HUB_TRANSFER';
          recommendedSourceHubId = bestSourceHub.id;
          recommendedSourceHubName = bestSourceHub.name;
          recommendedSourceHubAvailableStock = inventoryStockMap[`${bestSourceHub.id}_${product.id}`] || 0;
        } else {
          recommendationType = 'FARMER_SUPPLY';
        }
      }

      // Human readable AI Explanation
      let explanation = '';
      if (dataQualityStatus === 'Insufficient Historical Data') {
        explanation = `Insufficient historical order data for ${product.name} at ${hub.name}. Statistical baseline applied with Low confidence.`;
      } else if (recommendedReplenishment > 0) {
        const wholesalePct = predictedQuantity > 0 ? Math.round((wholesaleDemand / predictedQuantity) * 100) : 0;
        if (recommendationType === 'HUB_TRANSFER') {
          explanation = `Predicted ${periodDays}-day demand is ${predictedQuantity} ${product.unit} (${wholesalePct}% wholesale). Current available stock (${currentStock} ${product.unit}) is below target (${targetStock} ${product.unit}). Recommend inter-hub transfer from ${recommendedSourceHubName} (Surplus available: ${recommendedSourceHubAvailableStock} ${product.unit}).`;
        } else {
          explanation = `Predicted ${periodDays}-day demand is ${predictedQuantity} ${product.unit}. Stock (${currentStock} ${product.unit}) is insufficient. No nearby hub has adequate surplus stock. Recommend issuing additional Farmer Supply collection.`;
        }
      } else {
        explanation = `Inventory is healthy. Current stock (${currentStock} ${product.unit}) covers expected ${periodDays}-day demand (${predictedQuantity} ${product.unit}) plus 20% safety stock (${safetyStock} ${product.unit}).`;
      }

      const forecastId = `fc_${hub.id}_${product.id}_${forecastPeriod}`;

      forecasts.push({
        id: forecastId,
        productId: product.id,
        productName: product.name,
        category: product.category || 'Vegetables',
        unit: product.unit || 'Kg',
        hubId: hub.id,
        hubName: hub.name,
        forecastPeriod,
        retailDemand,
        wholesaleDemand,
        predictedQuantity,
        confidence,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        currentStock,
        confirmedIncoming,
        expectedRemaining,
        predictedShortage,
        safetyStock,
        recommendedReplenishment,
        stockoutDays,
        recommendationType,
        recommendedSourceHubId,
        recommendedSourceHubName,
        recommendedSourceHubAvailableStock,
        explanation,
        dataQualityStatus,
        generatedAt: new Date().toISOString(),
        modelVersion: 'baseline-v1',
      });
    });
  });

  return forecasts;
}

/**
 * GET /api/admin/forecasts
 * Retrieve AI demand forecasts with summary metrics and filtering
 */
export const getDemandForecasts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hubId, period = '7_days', category, search, status } = req.query;

    const forecastPeriod = (['7_days', '14_days', '30_days'].includes(String(period))
      ? String(period)
      : '7_days') as '7_days' | '14_days' | '30_days';

    // Refresh if empty or if requested
    if (!db.demandForecasts || db.demandForecasts.length === 0 || req.query.refresh === 'true') {
      db.demandForecasts = calculateDemandForecasts(forecastPeriod);
      db.saveData();
    }

    let list = [...db.demandForecasts].filter((f) => f.forecastPeriod === forecastPeriod);

    // If list empty for period, regenerate
    if (list.length === 0) {
      const fresh = calculateDemandForecasts(forecastPeriod);
      db.demandForecasts = [...db.demandForecasts.filter((f) => f.forecastPeriod !== forecastPeriod), ...fresh];
      db.saveData();
      list = fresh;
    }

    // Apply hub filter
    if (hubId && hubId !== 'all') {
      list = list.filter((f) => f.hubId === String(hubId));
    }

    // Apply category filter
    if (category && category !== 'all') {
      list = list.filter((f) => f.category.toLowerCase() === String(category).toLowerCase());
    }

    // Apply search filter
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (f) =>
          f.productName.toLowerCase().includes(q) ||
          f.hubName.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }

    // Apply status filter
    if (status === 'stockout') {
      list = list.filter((f) => f.stockoutDays !== undefined && f.stockoutDays <= 7);
    } else if (status === 'shortage') {
      list = list.filter((f) => f.predictedShortage > 0);
    } else if (status === 'recommended') {
      list = list.filter((f) => f.recommendedReplenishment > 0 && !f.isIgnored);
    }

    // Summary KPIs for dashboard overview widget
    const allForPeriod = db.demandForecasts.filter((f) => f.forecastPeriod === forecastPeriod);
    const summary = {
      totalPredictedDemand: allForPeriod.reduce((sum, f) => sum + f.predictedQuantity, 0),
      potentialStockouts: allForPeriod.filter((f) => f.stockoutDays !== undefined && f.stockoutDays <= 7).length,
      predictedShortages: allForPeriod.filter((f) => f.predictedShortage > 0).length,
      recommendedTransfers: allForPeriod.filter((f) => f.recommendationType === 'HUB_TRANSFER' && f.recommendedReplenishment > 0 && !f.isIgnored).length,
      recommendedFarmerSupply: allForPeriod.filter((f) => f.recommendationType === 'FARMER_SUPPLY' && f.recommendedReplenishment > 0 && !f.isIgnored).length,
      topDemandProducts: getTopDemandProducts(allForPeriod),
      highDemandHubs: getHighDemandHubs(allForPeriod),
    };

    res.json({
      success: true,
      count: list.length,
      forecasts: list,
      summary,
      period: forecastPeriod,
      generatedAt: db.demandForecasts[0]?.generatedAt || new Date().toISOString(),
      modelVersion: 'baseline-v1',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching AI demand forecasts.' });
  }
};

/**
 * POST /api/admin/forecasts/refresh
 * Regenerate AI demand forecasts
 */
export const refreshDemandForecasts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const period = (req.body.period || req.query.period || '7_days') as '7_days' | '14_days' | '30_days';

    const freshForecasts = calculateDemandForecasts(period);

    // Keep existing forecasts for other periods, replace current period
    db.demandForecasts = [
      ...(db.demandForecasts || []).filter((f) => f.forecastPeriod !== period),
      ...freshForecasts,
    ];
    db.saveData();

    res.json({
      success: true,
      message: `⚡ AI Demand Forecasts refreshed successfully for ${period.replace('_', ' ')}!`,
      count: freshForecasts.length,
      forecasts: freshForecasts,
      generatedAt: freshForecasts[0]?.generatedAt || new Date().toISOString(),
      modelVersion: 'baseline-v1',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error refreshing forecasts.' });
  }
};

/**
 * POST /api/admin/forecasts/:id/accept
 * Admin accepts an AI replenishment/transfer recommendation
 * Automatically creates HubTransfer or ReplenishmentRequest
 */
export const acceptForecastRecommendation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const forecast = (db.demandForecasts || []).find((f) => f.id === id);

    if (!forecast) {
      return res.status(404).json({ success: false, message: 'Forecast record not found.' });
    }

    if (forecast.recommendedReplenishment <= 0) {
      return res.status(400).json({ success: false, message: 'This forecast item has no replenishment requirement.' });
    }

    let createdEntity: any = null;
    let actionType: string = '';

    if (forecast.recommendationType === 'HUB_TRANSFER') {
      actionType = 'Hub Transfer Request';

      const sourceHub = (db.hubs || []).find((h) => h.id === forecast.recommendedSourceHubId) || {
        id: forecast.recommendedSourceHubId || 'hub_cbe',
        name: forecast.recommendedSourceHubName || 'Coimbatore Distribution Hub',
      };

      const newTransfer: IHubTransfer = {
        id: 'trf_' + Date.now() + Math.random().toString(36).substring(2, 5),
        sourceHubId: sourceHub.id,
        sourceHubName: sourceHub.name,
        destinationHubId: forecast.hubId,
        destinationHubName: forecast.hubName,
        items: [
          {
            productId: forecast.productId,
            productName: forecast.productName,
            quantity: forecast.recommendedReplenishment,
            unit: forecast.unit,
          },
        ],
        status: 'Requested',
        requestedBy: 'AI Smart Recommendation System (Admin Accepted)',
        requestedAt: new Date().toISOString(),
        notes: `AI Recommendation Accepted: 7-day predicted demand ${forecast.predictedQuantity} ${forecast.unit} at ${forecast.hubName}. Recommended transfer from ${sourceHub.name}.`,
      };

      db.transfers.unshift(newTransfer);
      createdEntity = newTransfer;
    } else {
      actionType = 'Replenishment Request';

      const newReplenishment: IReplenishmentRequest = {
        id: 'repl_' + Date.now() + Math.random().toString(36).substring(2, 5),
        hubId: forecast.hubId,
        hubName: forecast.hubName,
        productId: forecast.productId,
        productName: forecast.productName,
        requestedQuantity: forecast.recommendedReplenishment,
        unit: forecast.unit,
        currentAvailableQuantity: forecast.currentStock,
        lowStockThreshold: 10,
        sourceType: 'FARMER_SUPPLY',
        status: 'REQUESTED',
        requestedBy: 'AI Smart Recommendation System (Admin Accepted)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: `AI Smart Replenishment Accepted: Predicted shortage of ${forecast.predictedShortage} ${forecast.unit} at ${forecast.hubName}.`,
      };

      db.replenishmentRequests.unshift(newReplenishment);
      createdEntity = newReplenishment;
    }

    forecast.acceptedAt = new Date().toISOString();
    forecast.isIgnored = false;
    db.saveData();

    // Trigger Admin Notification
    createNotification({
      userId: 'usr_admin',
      role: 'admin',
      title: `AI Recommendation Accepted: ${actionType}`,
      message: `Admin accepted AI recommendation for "${forecast.productName}" at ${forecast.hubName} (${forecast.recommendedReplenishment} ${forecast.unit}).`,
      type: forecast.recommendationType === 'HUB_TRANSFER' ? 'transfer' : 'replenishment',
      priority: 'SUCCESS',
      relatedEntityId: createdEntity.id,
      relatedEntityType: forecast.recommendationType === 'HUB_TRANSFER' ? 'transfer' : 'replenishment',
    });

    res.json({
      success: true,
      message: `✅ AI Recommendation accepted! Created ${actionType} (${createdEntity.id}) for ${forecast.recommendedReplenishment} ${forecast.unit} of ${forecast.productName}.`,
      recommendationType: forecast.recommendationType,
      createdEntity,
      forecast,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error accepting forecast recommendation.' });
  }
};

/**
 * POST /api/admin/forecasts/:id/ignore
 * Admin ignores an AI forecast recommendation
 */
export const ignoreForecastRecommendation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const forecast = (db.demandForecasts || []).find((f) => f.id === id);

    if (!forecast) {
      return res.status(404).json({ success: false, message: 'Forecast record not found.' });
    }

    forecast.isIgnored = true;
    db.saveData();

    res.json({
      success: true,
      message: `Recommendation ignored for ${forecast.productName} at ${forecast.hubName}.`,
      forecast,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error ignoring forecast recommendation.' });
  }
};

// Helper: Top Demand Products
function getTopDemandProducts(forecasts: IDemandForecast[]) {
  const totals: Record<string, { id: string; name: string; category: string; unit: string; totalDemand: number }> = {};
  forecasts.forEach((f) => {
    if (!totals[f.productId]) {
      totals[f.productId] = {
        id: f.productId,
        name: f.productName,
        category: f.category,
        unit: f.unit,
        totalDemand: 0,
      };
    }
    totals[f.productId].totalDemand += f.predictedQuantity;
  });

  return Object.values(totals)
    .sort((a, b) => b.totalDemand - a.totalDemand)
    .slice(0, 5);
}

// Helper: High Demand Hubs
function getHighDemandHubs(forecasts: IDemandForecast[]) {
  const hubTotals: Record<string, { id: string; name: string; totalDemand: number; stockoutCount: number }> = {};
  forecasts.forEach((f) => {
    if (!hubTotals[f.hubId]) {
      hubTotals[f.hubId] = {
        id: f.hubId,
        name: f.hubName,
        totalDemand: 0,
        stockoutCount: 0,
      };
    }
    hubTotals[f.hubId].totalDemand += f.predictedQuantity;
    if (f.stockoutDays !== undefined && f.stockoutDays <= 7) {
      hubTotals[f.hubId].stockoutCount++;
    }
  });

  return Object.values(hubTotals).sort((a, b) => b.totalDemand - a.totalDemand);
}
