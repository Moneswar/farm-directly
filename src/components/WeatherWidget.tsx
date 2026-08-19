import React, { useEffect, useState } from 'react';
import { CloudSun, Droplets, Wind, Thermometer, Sprout, Compass } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useI18n } from '../context/LanguageContext';

export const WeatherWidget: React.FC<{ district?: string }> = ({ district = 'Coimbatore' }) => {
  const { t } = useI18n();
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await apiFetch(`/customer/weather?district=${encodeURIComponent(district)}`);
        if (res.success) {
          setWeatherData(res.weather);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadWeather();
  }, [district]);

  if (loading) return <div className="glass-card" style={{ padding: '1rem' }}>Loading Agro Weather Insights...</div>;
  if (!weatherData) return null;

  return (
    <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ background: '#10b981', color: '#ffffff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CloudSun size={22} />
          </div>
          <div>
            <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t('agroWeatherTitle')}</h4>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('liveMicroclimate')} {weatherData.location}</div>
          </div>
        </div>
        <span className="badge badge-success">{weatherData.condition}</span>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Thermometer size={20} style={{ color: '#ef4444' }} />
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{t('temperature')}</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{weatherData.temperature}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Droplets size={20} style={{ color: '#3b82f6' }} />
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{t('humidity')}</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{weatherData.humidity}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Wind size={20} style={{ color: '#10b981' }} />
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{t('windSpeed')}</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{weatherData.windSpeed}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Compass size={20} style={{ color: '#f59e0b' }} />
          <div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{t('soilMoisture')}</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>{weatherData.soilMoisture}</div>
          </div>
        </div>
      </div>

      {/* Suggested Crops Grid */}
      <h5 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Sprout size={16} style={{ color: 'var(--primary)' }} /> {t('recommendedCrops')}
      </h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
        {weatherData.suggestedCrops?.map((crop: any, idx: number) => (
          <div key={idx} style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>{crop.crop}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('season')}: <strong>{crop.season}</strong></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('estYield')}: {crop.expectedYield} ({crop.duration})</div>
          </div>
        ))}
      </div>
    </div>
  );
};
