import React from 'react';
import { Wind } from 'lucide-react';

export default function EnvironmentalCard({ pm25Value, pm25Status }) {
  const isGood = pm25Status === 'GOOD';
  const isModerate = pm25Status === 'MODERATE';

  const statusBadge = isGood ? {
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.4)',
    color: '#34d399',
    dot: '#10b981'
  } : isModerate ? {
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.4)',
    color: '#fbbf24',
    dot: '#f59e0b'
  } : {
    bg: 'rgba(239, 68, 68, 0.2)',
    border: 'rgba(239, 68, 68, 0.5)',
    color: '#f87171',
    dot: '#ef4444'
  };

  return (
    <div className="tactical-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wind style={{ width: '16px', height: '16px', color: '#22d3ee' }} />
          <span className="font-tactical" style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.08em' }}>
            ENVIRONMENTAL // PM2.5
          </span>
        </div>
        
        {/* Explicitly marked simulated */}
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'rgba(6, 182, 212, 0.12)',
          border: '1px solid rgba(6, 182, 212, 0.35)',
          color: '#22d3ee',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          letterSpacing: '0.05em'
        }}>
          [SIMULATED]
        </span>
      </div>

      {/* Main Metric */}
      <div style={{ margin: '8px 0', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94a3b8', display: 'block' }}>
            AIR QUALITY PARTICULATE
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="font-mono" style={{ fontSize: '32px', fontWeight: 700, color: '#67e8f9', lineHeight: 1 }}>
              {pm25Value?.toFixed(1) || '28.0'}
            </span>
            <span className="font-mono" style={{ fontSize: '11px', color: '#94a3b8' }}>µg/m³</span>
          </div>
        </div>

        {/* Status Chip */}
        <div style={{
          padding: '6px 12px',
          borderRadius: '6px',
          background: statusBadge.bg,
          border: `1px solid ${statusBadge.border}`,
          color: statusBadge.color,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusBadge.dot }} />
          <span className="font-tactical" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em' }}>
            {pm25Status || 'GOOD'}
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '8px',
        paddingTop: '6px',
        borderTop: '1px solid rgba(56, 75, 102, 0.25)',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: '#64748b',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>SPEC: PMS5003</span>
        <span>ISOLATED FROM VITALS</span>
      </div>
    </div>
  );
}
