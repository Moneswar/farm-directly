import React from 'react';
import { X, Printer, Download, Sprout, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export const InvoiceModal: React.FC<{ order: any; onClose: () => void }> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px', padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: '#10b981', color: '#ffffff', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sprout size={20} />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)' }}>TAX INVOICE</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FarmDirect Agricultural Tech Ltd.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <Printer size={16} /> Print / Save PDF
            </button>
            <button onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Invoice Header details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Billed To:</span>
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{order.customerName}</strong>
            <div>{order.customerEmail}</div>
            <div>{order.customerPhone}</div>
            <div>{order.deliveryAddress?.street}, {order.deliveryAddress?.district}, {order.deliveryAddress?.pincode}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Invoice No:</strong> INV-{order.id}</div>
            <div><strong>Order ID:</strong> #{order.id}</div>
            <div><strong>Date:</strong> {new Date(order.placedAt).toLocaleDateString()}</div>
            <div><strong>Payment Method:</strong> {order.paymentMethod}</div>
            <div><strong>Payment Status:</strong> <span className="badge badge-success">{order.paymentStatus}</span></div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--primary-light)', color: 'var(--text-primary)', textAlign: 'left' }}>
              <th style={{ padding: '0.65rem' }}>Item & Farmer</th>
              <th style={{ padding: '0.65rem' }}>Qty</th>
              <th style={{ padding: '0.65rem' }}>Unit Price</th>
              <th style={{ padding: '0.65rem', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.65rem' }}>
                  <div style={{ fontWeight: 600 }}>{item.productName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Farmer: {item.farmerName}</div>
                </td>
                <td style={{ padding: '0.65rem' }}>{item.quantity} {item.unit}</td>
                <td style={{ padding: '0.65rem' }}>{formatCurrency(item.price)}</td>
                <td style={{ padding: '0.65rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span> <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>GST (5%):</span> <span>{formatCurrency(order.gstAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Charge:</span> <span>{formatCurrency(order.deliveryCharge)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                <span>Discount:</span> <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border-color)', paddingTop: '0.5rem', fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
              <span>Grand Total:</span> <span>{formatCurrency(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <CheckCircle size={14} style={{ color: 'var(--primary)', verticalAlign: 'middle', marginRight: '4px' }} />
          Thank you for supporting Indian organic farmers directly. FSSAI License No: 12423001000981.
        </div>
      </div>
    </div>
  );
};
