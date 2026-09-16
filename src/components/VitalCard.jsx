import React from 'react';

export default function VitalCard({
  title,
  value,
  unit,
  subtext,
  icon: Icon,
  statusColor = "cyan",
  alert = false,
  offline = false
}) {
  const displayValue = (offline || value === null || value === undefined) ? "--" : value;

  const colorStyles = {
    emerald: {
      border: 'rgba(16, 185, 129, 0.4)',
      text: '#34d399',
      glow: '0 0 15px rgba(16, 185, 129, 0.15)',
      accentBg: 'rgba(16, 185, 129, 0.12)',
      accentText: '#10b981'
    },
    cyan: {
      border: 'rgba(6, 182, 212, 0.35)',
      text: '#22d3ee',
      glow: '0 0 15px rgba(6, 182, 212, 0.15)',
      accentBg: 'rgba(6, 182, 212, 0.12)',
      accentText: '#06b6d4'
    },
    amber: {
      border: 'rgba(245, 158, 11, 0.45)',
      text: '#fbbf24',
      glow: '0 0 15px rgba(245, 158, 11, 0.2)',
      accentBg: 'rgba(245, 158, 11, 0.12)',
      accentText: '#f59e0b'
    },
    rose: {
      border: 'rgba(239, 68, 68, 0.55)',
      text: '#f87171',
      glow: '0 0 20px rgba(239, 68, 68, 0.25)',
      accentBg: 'rgba(239, 68, 68, 0.15)',
      accentText: '#ef4444'
    },
    slate: {
      border: 'rgba(56, 75, 102, 0.4)',
      text: '#94a3b8',
      glow: 'none',
      accentBg: 'rgba(30, 41, 59, 0.6)',
      accentText: '#64748b'
    }
  };

  const currentStyle = offline ? colorStyles.slate : (colorStyles[statusColor] || colorStyles.cyan);

  return (
    <div
      className="tactical-card corner-hud"
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderColor: currentStyle.border,
        boxShadow: currentStyle.glow,
        animation: alert ? 'pulse-red 1.2s infinite' : 'none'
      }}
    >
      {/* Top row: title & icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span className="font-tactical" style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.08em' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            padding: '6px',
            borderRadius: '6px',
            background: currentStyle.accentBg,
            color: currentStyle.accentText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon style={{ width: '16px', height: '16px' }} />
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
        <span className="font-mono" style={{ fontSize: '32px', fontWeight: 700, color: currentStyle.text, lineHeight: 1 }}>
          {displayValue}
        </span>
        {unit && displayValue !== "--" && (
          <span className="font-mono" style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
            {unit}
          </span>
        )}
      </div>

      {/* Bottom row: Subtext indicator */}
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid rgba(56, 75, 102, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: '#64748b'
      }}>
        <span>{subtext || "REAL HARDWARE FEED"}</span>
        {displayValue === "--" && (
          <span style={{ color: '#ef4444', fontWeight: 600, letterSpacing: '0.05em' }}>UNAVAILABLE</span>
        )}
      </div>
    </div>
  );
}
