import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Package, FileText, Star, ChevronDown, ChevronUp, MapPin, Calendar, CheckCircle2, Sparkles, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useI18n } from '../context/LanguageContext';
import { OrderTracker } from '../components/OrderTracker';
import { InvoiceModal } from '../components/InvoiceModal';
import { formatCurrency } from '../utils/currency';

export const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryOrderId = searchParams.get('orderId');
  const targetOrderId = location.state?.highlightedOrderId || queryOrderId;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(targetOrderId || null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any | null>(null);

  // Review Modal
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiFetch('/orders');
      if (res.success) {
        setOrders(res.orders || []);
        if (res.orders?.length > 0) {
          if (targetOrderId && res.orders.some((o: any) => o.id === targetOrderId)) {
            setExpandedOrderId(targetOrderId);
          } else if (!expandedOrderId) {
            setExpandedOrderId(res.orders[0].id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm(`Are you sure you want to cancel Order #${orderId}? Reserved stock will be restored and any payment will be refunded to your wallet.`)) {
      return;
    }
    try {
      setCancellingOrderId(orderId);
      const res = await apiFetch(`/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      if (res.success) {
        alert(res.message || 'Order cancelled successfully.');
        await fetchOrders(true);
      } else {
        alert(res.message || 'Failed to cancel order.');
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Real-time polling every 3 seconds to reflect delivery boy status updates instantly
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [targetOrderId]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder || !reviewOrder.items?.[0]) return;
    setSubmittingReview(true);
    try {
      const res = await apiFetch('/customer/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: reviewOrder.items[0].productId,
          farmerId: reviewOrder.items[0].farmerId,
          orderId: reviewOrder.id,
          rating,
          comment,
        }),
      });
      if (res.success) {
        alert('Review submitted successfully!');
        setReviewOrder(null);
        setComment('');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return '#22c55e';
      case 'Out for Delivery': return '#3b82f6';
      case 'Cancelled': return '#ef4444';
      case 'Assigned': return '#f59e0b';
      case 'Pickup Complete': return '#8b5cf6';
      case 'Ready for Pickup': return '#E74C3C';
      case 'Completed': return '#22c55e';
      default: return 'var(--primary)';
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '3rem auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)' }}>Loading live order tracking...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary btn-sm"
        style={{ borderRadius: 'var(--radius-pill)', gap: '0.4rem', marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> {t('back')}
      </button>
      {/* Banner if redirected from recent checkout */}
  {targetOrderId && (() => {
        // Find the specific order to show context-aware banner
        const newOrder = orders.find((o: any) => o.id === targetOrderId);
        const isSelfPickup = newOrder?.deliveryMethod === 'self_pickup';
        return (
          <div
            className="glass-card"
            style={{
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                Order Placed Successfully! <Sparkles size={16} />
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {isSelfPickup
                  ? <>Your order <strong>#{targetOrderId}</strong> is confirmed. When the hub notifies you, bring your <strong>4-digit pickup verification code</strong> to collect your order.</>
                  : <>Your order <strong>#{targetOrderId}</strong> is active. Use the 6-digit Delivery OTP below when your delivery agent arrives.</>
                }
              </p>
            </div>
          </div>
        );
      })()}

      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
        My Farm Orders & Live Tracking ({orders.length})
      </h2>

      {orders.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No past orders found</h3>
          <p style={{ color: 'var(--text-muted)' }}>When you buy fresh produce directly from farmers, your live order tracker appears here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {orders.map((ord) => {
            const isExpanded = expandedOrderId === ord.id;
            return (
              <div key={ord.id} className="glass-card" style={{ overflow: 'hidden', border: `1px solid ${isExpanded ? 'var(--primary)' : 'var(--border-color)'}`, transition: 'border-color 0.3s' }}>

                {/* Clickable Order Header */}
                <div
                  onClick={() => toggleExpand(ord.id)}
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 1.5rem',
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--primary-light)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Status dot */}
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: statusColor(ord.orderStatus),
                      boxShadow: `0 0 8px ${statusColor(ord.orderStatus)}`,
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                        Order #{ord.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Calendar size={11} /> {new Date(ord.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span>{ord.items?.length} item{ord.items?.length !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span style={{ color: statusColor(ord.orderStatus), fontWeight: 700 }}>{ord.orderStatus}</span>
                      </div>
                    </div>
                  </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{formatCurrency(ord.grandTotal)}</div>
                      <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                        <span className={`badge ${ord.paymentStatus === 'PAID' || ord.paymentStatus === 'Completed' || ord.paymentStatus === 'Paid' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          {ord.paymentStatus || 'Pending'}
                        </span>
                        {(ord.paymentStatus === 'Pending' || ord.paymentStatus === 'FAILED') && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const res = await apiFetch('/payments/retry', {
                                method: 'POST',
                                body: JSON.stringify({ orderId: ord.id }),
                              });
                              if (res.success && res.payment) {
                                const verifyRes = await apiFetch('/payments/verify', {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    paymentId: res.payment.paymentId,
                                    orderId: ord.id,
                                    gatewayTransactionId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
                                    status: 'SUCCESS',
                                  }),
                                });
                                if (verifyRes.success) {
                                  alert('Payment retry successful!');
                                  fetchOrders();
                                } else {
                                  alert(verifyRes.message);
                                }
                              } else {
                                alert(res.message);
                              }
                            }}
                            className="btn btn-warning btn-sm"
                            style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                          >
                            [Retry Payment]
                          </button>
                        )}
                      </div>
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>

                    {/* Order Tracker with Tracking ID + OTP + Delivery Boy + Hub Distance */}
                    <OrderTracker
                      status={ord.orderStatus}
                      deliveryOtp={ord.deliveryOtp}
                      deliveryBoyName={ord.deliveryBoyName}
                      deliveryBoyPhone={ord.deliveryBoyPhone}
                      orderId={ord.id}
                      hubName={ord.hubName || ord.deliveryHubName}
                      deliveryMethod={ord.deliveryMethod}
                      deliveryDistanceKm={ord.deliveryDistanceKm}
                      deliveryCharge={ord.deliveryCharge}
                      deliveredAt={ord.deliveredAt}
                      deliveryOtpVerified={ord.deliveryOtpVerified}
                    />

                    {/* Delivery Method & Address Info */}
                    <div style={{
                      background: 'var(--bg-card-solid)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                    }}>
                      <MapPin size={16} style={{ color: 'var(--primary)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                          Delivery Method: <strong style={{ color: ord.deliveryMethod === 'home_delivery' ? '#3498DB' : '#2ECC71' }}>
                            {ord.deliveryMethod === 'home_delivery' ? `🚚 Home Delivery (Fee: ₹${ord.deliveryCharge || 0})` : `📦 Self Pickup (${ord.hubName || ord.deliveryHubName || 'Coimbatore Distribution Hub'})`}
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ord.deliveryAddress ? `${ord.deliveryAddress.street}, ${ord.deliveryAddress.district}, ${ord.deliveryAddress.pincode}` : 'Coimbatore Hub Pickup'}
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Items Ordered
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {ord.items?.map((it: any, idx: number) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem 0.75rem',
                            background: 'var(--bg-card-solid)',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                          }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{it.productName}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> × {it.quantity} {it.unit}</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Farmer: {it.farmerName}</div>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div style={{
                      background: 'var(--bg-card-solid)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>Subtotal</span><span>{formatCurrency(ord.subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>GST</span><span>{formatCurrency(ord.gstAmount)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>Delivery</span>
                          <span style={{ color: ord.deliveryCharge === 0 ? '#22c55e' : 'var(--text-muted)' }}>
                            {ord.deliveryCharge === 0 ? 'FREE' : formatCurrency(ord.deliveryCharge)}
                          </span>
                        </div>
                        {ord.discountAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                            <span>Discount</span><span>-{formatCurrency(ord.discountAmount)}</span>
                          </div>
                        )}
                        <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          <span>Grand Total</span><span>{formatCurrency(ord.grandTotal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Self Pickup: Ready for Pickup Collection Card */}
                    {ord.deliveryMethod === 'self_pickup' && (ord.orderStatus === 'Ready for Pickup' || ord.orderStatus === 'Completed') && (
                      <div style={{
                        background: ord.orderStatus === 'Completed' ? 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, var(--bg-card-solid) 100%)' : 'linear-gradient(135deg, rgba(231,76,60,0.08) 0%, var(--bg-card-solid) 100%)',
                        border: `1px solid ${ord.orderStatus === 'Completed' ? 'rgba(34,197,94,0.4)' : 'rgba(231,76,60,0.4)'}`,
                        borderRadius: '12px',
                        padding: '1.25rem',
                        marginBottom: '1rem',
                      }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {ord.orderStatus === 'Completed' ? '✅ Pickup Completed' : '📦 Ready for Pickup'}
                        </div>
                        <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div><strong>Pickup Hub:</strong> {ord.hubName || ord.deliveryHubName || 'Distribution Hub'}</div>
                          <div><strong>Delivery Charge:</strong> <span style={{ color: '#22c55e', fontWeight: 700 }}>₹0 (Self Pickup)</span></div>
                          {ord.orderStatus === 'Ready for Pickup' && (
                            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(231,76,60,0.06)', borderRadius: '8px', border: '1px dashed rgba(231,76,60,0.4)' }}>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Your Pickup Verification Code (show to hub staff):</div>
                              <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.4em', color: '#E74C3C' }}>{ord.deliveryOtp || '----'}</div>
                            </div>
                          )}
                          {ord.orderStatus === 'Completed' && ord.pickupCompletedAt && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              Collected on: {new Date(ord.pickupCompletedAt).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button onClick={() => setSelectedInvoiceOrder(ord)} className="btn btn-secondary btn-sm">
                        <FileText size={15} /> Tax Invoice
                      </button>
                      {['Pending', 'Confirmed', 'Assigned', 'Hub Processing', 'Pending Processing'].includes(ord.orderStatus) && (
                        <button
                          type="button"
                          disabled={cancellingOrderId === ord.id}
                          onClick={() => handleCancelOrder(ord.id)}
                          className="btn btn-danger btn-sm"
                          style={{ fontSize: '0.8rem' }}
                        >
                          {cancellingOrderId === ord.id ? 'Cancelling...' : '✕ Cancel Order'}
                        </button>
                      )}
                      {(ord.orderStatus === 'Delivered' || (ord.orderStatus === 'Completed' && ord.deliveryMethod === 'self_pickup')) && (
                        <button onClick={() => setReviewOrder(ord)} className="btn btn-primary btn-sm">
                          <Star size={15} /> Rate Farmer
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoiceOrder && (
        <InvoiceModal order={selectedInvoiceOrder} onClose={() => setSelectedInvoiceOrder(null)} />
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Rate Produce & Farmer</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Your feedback directly supports local farmers.</p>
            <form onSubmit={handleReviewSubmit}>
              <div className="form-group">
                <label className="form-label">Rating (1 to 5 Stars)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ background: 'none', color: star <= rating ? '#f59e0b' : 'var(--text-muted)' }}
                    >
                      <Star size={28} fill={star <= rating ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Comments / Feedback</label>
                <textarea rows={3} required value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Super fresh produce! Delivered quickly." className="form-textarea" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setReviewOrder(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submittingReview} className="btn btn-primary" style={{ flex: 1 }}>Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
