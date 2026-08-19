import React, { useState, useEffect } from 'react';
import { Clock, Zap, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { useI18n } from '../context/LanguageContext';

export const DealCountdown: React.FC = () => {
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 5, minutes: 59, seconds: 59 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const format2 = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      className="glass-card"
      style={{
        marginBottom: '2rem',
        padding: '1.25rem 1.75rem',
        background: 'linear-gradient(135deg, rgba(230, 126, 34, 0.12) 0%, rgba(17, 18, 24, 0.95) 100%)',
        border: '1px solid rgba(230, 126, 34, 0.3)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #E67E22 0%, #D35400 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(230, 126, 34, 0.3)' }}>
          <Zap size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Today's Express Harvest Cutoff</span>
            <span className="badge badge-warning" style={{ fontSize: '0.725rem' }}>SAVE 30% OFF</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Order before countdown ends to guarantee same-day 6:00 AM morning harvest delivery from Nilgiris & Coimbatore farms.</p>
        </div>
      </div>

      {/* Countdown Digits & Action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={18} style={{ color: 'var(--accent)' }} />
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', fontWeight: 900, fontSize: '1rem', color: 'var(--accent)', minWidth: '36px', textAlign: 'center' }}>
              {format2(timeLeft.hours)}
            </div>
            <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>:</span>
            <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', fontWeight: 900, fontSize: '1rem', color: 'var(--accent)', minWidth: '36px', textAlign: 'center' }}>
              {format2(timeLeft.minutes)}
            </div>
            <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>:</span>
            <div style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', fontWeight: 900, fontSize: '1rem', color: 'var(--accent)', minWidth: '36px', textAlign: 'center' }}>
              {format2(timeLeft.seconds)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('products-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="btn btn-accent btn-sm"
          style={{ borderRadius: 'var(--radius-pill)', padding: '0.5rem 1.1rem', gap: '0.35rem' }}
        >
          Claim Wholesale Deals <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
