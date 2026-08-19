import React from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  Package,
  Home,
  Phone,
  User,
  ShieldCheck,
  Navigation,
  MapPin,
  Sparkles,
  Star,
  MessageSquare,
  ShieldAlert,
  Building,
  Layers,
} from 'lucide-react';

const steps = [
  { id: 'Confirmed', label: 'Order Placed', icon: Package, desc: 'Farmer confirmed order' },
  { id: 'Assigned', label: 'Driver Assigned', icon: Clock, desc: 'Partner en-route to farm' },
  { id: 'Pickup Complete', label: 'Farm Picked Up', icon: CheckCircle2, desc: 'Harvest collected from farm' },
  { id: 'Arrived at Hub', label: 'Arrived at Hub', icon: Building, desc: 'Received at Distribution Hub' },
  { id: 'Hub Processing', label: 'Hub Sorting', icon: Layers, desc: 'Quality check & hub processing' },
  { id: 'Out for Delivery', label: 'Out for Delivery', icon: Truck, desc: 'Out for delivery to address' },
  { id: 'Delivered', label: 'Delivered', icon: Home, desc: 'OTP verified & delivered' },
];

interface OrderTrackerProps {
  status: string;
  deliveryOtp?: string;
  deliveryBoyName?: string;
  deliveryBoyPhone?: string;
  orderId?: string;
  hubName?: string;
  hubStatus?: string;
  deliveryMethod?: string;
  deliveryDistanceKm?: number;
  deliveryCharge?: number;
  deliveredAt?: string;
  deliveryOtpVerified?: boolean;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  status,
  deliveryOtp,
  deliveryBoyName,
  deliveryBoyPhone,
  orderId,
  hubName,
  hubStatus,
  deliveryMethod = 'home_delivery',
  deliveryDistanceKm = 6.5,
  deliveryCharge = 30,
  deliveredAt,
  deliveryOtpVerified,
}) => {
  const isSelfPickup = deliveryMethod === 'self_pickup';

  const homeDeliverySteps = [
    { id: 'Confirmed', label: 'Order Placed', icon: Package, desc: 'Farmer confirmed produce items' },
    { id: 'Assigned', label: 'Driver Assigned', icon: Clock, desc: 'Delivery partner assigned at Hub' },
    { id: 'Picked Up from Hub', label: 'Picked Up From Hub', icon: Building, desc: `Collected from ${hubName || 'Distribution Hub'}` },
    { id: 'Hub Processing', label: 'Hub Sorting', icon: Layers, desc: 'Quality inspection & regional hub sorting' },
    { id: 'Out for Delivery', label: 'Out for Delivery', icon: Truck, desc: 'Partner en-route to your door' },
    { id: 'Delivered', label: 'Delivered', icon: Home, desc: 'OTP verified & delivered' },
  ];

  const selfPickupSteps = [
    { id: 'Confirmed', label: 'Order Placed', icon: Package, desc: 'Order received at distribution hub' },
    { id: 'Hub Processing', label: 'Hub Processing', icon: Layers, desc: 'Produce sorted & packaged at hub' },
    { id: 'Ready for Pickup', label: 'Ready for Pickup', icon: Building, desc: `Ready for collection at ${hubName || 'Distribution Hub'}` },
    { id: 'Completed', label: 'Collected', icon: CheckCircle2, desc: 'Order collected by customer ✅' },
  ];

  const activeSteps = isSelfPickup ? selfPickupSteps : homeDeliverySteps;
  // For self_pickup: treat 'Completed' as terminal; for home_delivery: treat 'Delivered' as terminal
  const normalizedStatus = isSelfPickup && status === 'Delivered' ? 'Completed' : status;
  const currentStepIndex = Math.max(0, activeSteps.findIndex((s) => s.id === normalizedStatus));
  const isDelivered = status === 'Delivered' || status === 'Completed';

  // Dynamic ETA & message based on order status (Zomato/Swiggy style)
  const getEtaInfo = () => {
    if (isSelfPickup) {
      switch (status) {
        case 'Confirmed':
          return { eta: '20-30 mins', title: 'Processing at Distribution Hub 🏭', sub: `Your produce is being assembled at ${hubName || 'Distribution Hub'}` };
        case 'Hub Processing':
          return { eta: '10-15 mins', title: 'Hub Quality Check & Packaging 📦', sub: 'Preparing your item package for pickup' };
        case 'Ready for Pickup':
        case 'Arrived at Hub':
          return { eta: 'Ready Now', title: `Ready for Pickup at ${hubName || 'Distribution Hub'} 📦`, sub: 'Please visit the hub counter to collect your order' };
        case 'Delivered':
        case 'Completed':
          return { eta: 'Completed', title: 'Order Collected! 🎉', sub: 'Self pickup completed successfully' };
        default:
          return { eta: '15-20 mins', title: 'Self Pickup Order Active', sub: `Pickup at ${hubName || 'Distribution Hub'}` };
      }
    }

    switch (status) {
      case 'Confirmed':
        return { eta: '35-40 mins', title: 'Preparing at Distribution Hub 🏭', sub: `Produce arriving from farms at ${hubName || 'Distribution Hub'}` };
      case 'Assigned':
        return { eta: '30-35 mins', title: 'Delivery Partner Assigned 🛵', sub: `${deliveryBoyName || 'Delivery Agent'} assigned from ${hubName || 'Distribution Hub'}` };
      case 'Picked Up from Hub':
      case 'Pickup Complete':
        return { eta: '20-25 mins', title: `Picked Up From ${hubName || 'Distribution Hub'} 🚚`, sub: 'En-route to customer address' };
      case 'Hub Processing':
        return { eta: '15-20 mins', title: 'Hub Sorting & Quality Check 📦', sub: 'Verified & prepared for final delivery dispatch' };
      case 'Out for Delivery':
        return { eta: '6-10 mins', title: 'Out for Delivery 📍', sub: `Distance: ${deliveryDistanceKm} km • Delivery Fee: ₹${deliveryCharge}` };
      case 'Delivered':
        return { eta: 'Completed', title: 'Order Delivered! 🎉', sub: 'Verified by OTP • Thank you for supporting local farmers!' };
      default:
        return { eta: '20-25 mins', title: 'Order Processing', sub: 'Live tracking active' };
    }
  };

  const etaInfo = getEtaInfo();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
      
      {/* 1. ZOMATO/SWIGGY LIVE BANNER & ETA CARD */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem',
          background: isDelivered
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%)',
          border: isDelivered ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: isDelivered ? '#22c55e' : '#f59e0b',
                  boxShadow: isDelivered ? '0 0 10px #22c55e' : '0 0 10px #f59e0b',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: isDelivered ? '#22c55e' : '#f59e0b', letterSpacing: '0.05em' }}>
                ZOMATO / SWIGGY LIVE TRACKING • #{orderId || 'ORD'}
              </span>
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              {etaInfo.title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {etaInfo.sub}
            </p>
          </div>

          <div
            style={{
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-color)',
              padding: '0.75rem 1.25rem',
              borderRadius: '14px',
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Estimated Arrival
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: isDelivered ? '#22c55e' : '#f59e0b' }}>
              {etaInfo.eta}
            </div>
          </div>
        </div>

        {/* Live GPS Route Visualizer Bar */}
        {!isDelivered && (
          <div
            style={{
              marginTop: '1.25rem',
              background: '#0a111a',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#93c5fd' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building size={14} color="#10b981" /> {hubName || 'Coimbatore Distribution Hub'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
                <MapPin size={14} color="#ef4444" /> Your Home Location
              </span>
            </div>

            {/* Glowing route line with bike position */}
            <div style={{ position: 'relative', height: '8px', background: '#1e293b', borderRadius: '4px', margin: '0.5rem 0' }}>
              <div
                style={{
                  height: '100%',
                  width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                  background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #f59e0b 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.8s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: `calc(${((currentStepIndex + 1) / steps.length) * 100}% - 14px)`,
                  background: '#f59e0b',
                  color: '#000000',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px #f59e0b',
                  transition: 'left 0.8s ease',
                }}
              >
                <Truck size={16} />
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
              ● Live GPS Signal Active • Distance Remaining: ~3.4 km
            </div>
          </div>
        )}
      </div>

      {/* 2. DELIVERY AGENT & OTP GRID — Context-aware for self pickup vs home delivery */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

        {isSelfPickup ? (
          /* Self Pickup: Hub Info Card */
          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              borderLeft: '4px solid #2ECC71',
              background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.05) 0%, var(--bg-card-solid) 100%)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#2ECC71', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building size={13} /> Self Pickup — Distribution Hub
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              {hubName || 'Coimbatore Distribution Hub'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div>🚫 No Delivery Boy Required</div>
              <div style={{ color: '#2ECC71', fontWeight: 700 }}>✅ ₹0 Delivery Charge</div>
              <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                {status === 'Completed'
                  ? 'Order has been collected. Thank you! 🎉'
                  : status === 'Ready for Pickup'
                  ? 'Visit the hub counter. Bring your 4-digit code below.'
                  : 'Your order is being processed at the hub.'}
              </div>
            </div>
          </div>
        ) : (
          /* Home Delivery: Delivery Partner Card */
          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              borderLeft: '4px solid #22c55e',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, var(--bg-card-solid) 100%)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={13} /> Delivery Partner Assigned
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
                  alt="Delivery Agent"
                  style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #22c55e' }}
                />
                <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#22c55e', color: '#fff', borderRadius: '50%', padding: '2px' }}>
                  <CheckCircle2 size={12} />
                </span>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {deliveryBoyName || 'Karthik Express'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={12} fill="#f59e0b" /> 4.9 (1,240+ trips)
                  </span>
                  <span>•</span>
                  <span>EV Scooter</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 600, marginTop: '2px' }}>
                  ✓ Accepted & Picked from Farm
                </div>
              </div>
            </div>

            {/* Quick Call & Message Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
              <a
                href={`tel:${deliveryBoyPhone || '+919876543213'}`}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', textDecoration: 'none', fontWeight: 700 }}
              >
                <Phone size={14} color="#22c55e" /> Call Partner
              </a>
              <button
                onClick={() => alert(`💬 Messaging ${deliveryBoyName || 'Delivery Partner'}: "Please bring order to front gate"`)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontWeight: 700 }}
              >
                <MessageSquare size={14} color="#3b82f6" /> Message
              </button>
            </div>
          </div>
        )}

        {/* OTP / Pickup Verification Code Card or Delivered Completion Card */}
        {status === 'Delivered' || (isSelfPickup && status === 'Completed') ? (
          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              borderLeft: '4px solid #10b981',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-card-solid) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} /> {isSelfPickup ? 'Order Picked Up Successfully' : 'Order Delivered Successfully'}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#10b981', margin: '0.25rem 0' }}>
                ✓ {isSelfPickup ? 'Pickup Completed' : 'Delivery Completed'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {deliveredAt
                  ? `Delivered on: ${new Date(deliveredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
                  : 'Delivered successfully to your destination address.'}
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem' }}>
              <ShieldCheck size={14} /> Delivery verification: ✓ OTP Verified
            </div>
          </div>
        ) : (
          <div
            className="glass-card"
            style={{
              padding: '1.25rem',
              borderLeft: `4px solid ${isSelfPickup ? '#E74C3C' : '#f59e0b'}`,
              background: isSelfPickup
                ? 'linear-gradient(135deg, rgba(231, 76, 60, 0.08) 0%, var(--bg-card-solid) 100%)'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-card-solid) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: isSelfPickup ? '#E74C3C' : '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} /> {isSelfPickup ? 'Pickup Verification Code' : 'Delivery Verification OTP'}
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', margin: '0.6rem 0' }}>
                {(deliveryOtp || (isSelfPickup ? '----' : '------')).split('').map((digit, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      background: '#000000',
                      border: `2px solid ${isSelfPickup ? '#E74C3C' : '#f59e0b'}`,
                      borderRadius: '10px',
                      padding: '0.5rem 0.2rem',
                      textAlign: 'center',
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      color: isSelfPickup ? '#E74C3C' : '#f59e0b',
                      boxShadow: `0 2px 8px ${isSelfPickup ? 'rgba(231, 76, 60, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                    }}
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem' }}>
              <ShieldAlert size={12} style={{ color: isSelfPickup ? '#E74C3C' : '#f59e0b' }} />
              {isSelfPickup
                ? 'Show this code to hub staff when collecting your order.'
                : 'Give this 6-digit OTP to the delivery agent when your order arrives.'}
            </div>
          </div>
        )}
      </div>

      {/* 3. STEPPER PROGRESS BAR */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem 1rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '36px',
            left: '10%',
            right: '10%',
            height: '3px',
            background: 'var(--border-color)',
            zIndex: 0,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(currentStepIndex / (activeSteps.length - 1)) * 100}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #22c55e 100%)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {activeSteps.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isCompleted ? '#22c55e' : 'var(--bg-card-solid)',
                    color: isCompleted ? '#ffffff' : 'var(--text-muted)',
                    border: `2px solid ${isCompleted ? '#22c55e' : 'var(--border-color)'}`,
                    boxShadow: isCurrent ? '0 0 0 5px rgba(34, 197, 94, 0.25)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Icon size={18} />
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: isCurrent ? 800 : 600,
                    color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                    marginTop: '0.4rem',
                    textAlign: 'center',
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
