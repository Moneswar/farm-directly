/**
 * FarmDirect — Currency & Financial Rounding Utilities
 * Prevents JavaScript floating-point precision errors (e.g., 2.1400000000000023) across UI and calculations.
 */

/**
 * Safely rounds a numeric price/currency value to 2 decimal places.
 * Handles floating-point inaccuracies like 46.86000000000001 -> 46.86.
 */
export const roundPrice = (val: number | null | undefined): number => {
  if (val === null || val === undefined || isNaN(Number(val))) return 0;
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
};

/**
 * Formats a currency value consistently in Indian Rupees (₹).
 * Examples:
 *   46.86000000000001 -> "₹46.86"
 *   2.1400000000000023 -> "₹2.14"
 *   3.4900000000000034 -> "₹3.49"
 *   6.1899999999999995 -> "₹6.19"
 *   50 -> "₹50"
 */
export const formatCurrency = (
  val: number | null | undefined,
  includeSymbol: boolean = true
): string => {
  const rounded = roundPrice(val);
  const formattedNumber =
    rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2).replace(/\.?0+$/, '');
  return includeSymbol ? `₹${formattedNumber}` : formattedNumber;
};

/**
 * Safely calculates savings amount between market price and selling price.
 */
export const calculateSavings = (
  sellingPrice: number,
  marketPrice?: number
): { savingsAmount: number; savingsPercent: number } => {
  const sPrice = roundPrice(sellingPrice);
  const mPrice = marketPrice && marketPrice > sPrice ? roundPrice(marketPrice) : roundPrice(sPrice * 1.38);
  const savingsAmount = roundPrice(mPrice - sPrice);
  const savingsPercent = mPrice > 0 ? Math.round((savingsAmount / mPrice) * 100) : 0;
  return { savingsAmount, savingsPercent };
};
