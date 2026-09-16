import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Radio } from 'lucide-react';

export default function GpsMap({ latitude, longitude, altitude, satellites, gpsFix, gpsSource, locationLabel }) {
  const [coordsHistory, setCoordsHistory] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (latitude && longitude) {
      setCoordsHistory(prev => {
        const next = [...prev, { lat: latitude, lon: longitude, time: Date.now() }];
        return next.slice(-50);
      });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Radar background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // Rings
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.lineWidth = 1;
    [35, 70, 105, 140].forEach(r => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.beginPath();
    ctx.moveTo(centerX, 8);
    ctx.lineTo(centerX, h - 8);
    ctx.moveTo(8, centerY);
    ctx.lineTo(w - 8, centerY);
    ctx.stroke();

    // Scale labels
    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.font = '9px monospace';
    ctx.fillText('N 000°', centerX + 5, 18);
    ctx.fillText('100m', centerX + 40, centerY - 4);
    ctx.fillText('200m', centerX + 75, centerY - 4);

    // Breadcrumbs trail
    if (coordsHistory.length > 1) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      
      coordsHistory.forEach((pt, i) => {
        const dx = (pt.lon - longitude) * 20000;
        const dy = -(pt.lat - latitude) * 20000;
        const px = centerX + dx;
        const py = centerY + dy;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Soldier marker
    ctx.fillStyle = gpsFix ? '#10b981' : '#06b6d4';
    ctx.shadowColor = gpsFix ? 'rgba(16, 185, 129, 0.8)' : 'rgba(6, 182, 212, 0.8)';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  }, [latitude, longitude, coordsHistory, gpsFix]);

  return (
    <div className="tactical-card" style={{ padding: '14px 16px', marginBottom: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation style={{ width: '16px', height: '16px', color: '#22d3ee' }} />
          <span className="font-tactical" style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.08em' }}>
            {locationLabel || "GPS VIT Chennai"}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            background: gpsSource === 'real_gnss' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.6)',
            border: `1px solid ${gpsSource === 'real_gnss' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 75, 102, 0.5)'}`,
            color: gpsSource === 'real_gnss' ? '#34d399' : '#94a3b8',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)'
          }}>
            {gpsSource === 'real_gnss' ? 'SIM7670G FIX' : 'VIT CHENNAI REF'}
          </span>

          <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            background: gpsFix ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${gpsFix ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.4)'}`,
            color: gpsFix ? '#34d399' : '#fbbf24',
            fontSize: '10px',
            fontFamily: 'var(--font-tactical)',
            fontWeight: 700
          }}>
            {gpsFix ? 'GNSS FIX' : 'NO FIX (FALLBACK)'}
          </span>
        </div>
      </div>

      {/* Radar Map Canvas */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '140px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        margin: '6px 0'
      }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={140}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        <div style={{
          position: 'absolute',
          top: '6px',
          left: '8px',
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          borderRadius: '4px',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: '#22d3ee'
        }}>
          GRID: 12°50'26.8"N 80°09'14.5"E (VIT CHENNAI CAMPUS)
        </div>

        <div style={{
          position: 'absolute',
          bottom: '6px',
          right: '8px',
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          borderRadius: '4px',
          border: '1px solid rgba(56, 75, 102, 0.5)',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Radio style={{ width: '11px', height: '11px', color: '#22d3ee' }} />
          <span>SATS: {satellites || 0}</span>
        </div>
      </div>

      {/* Coordinates Grid */}
      <div className="coords-grid-3">
        <div style={{ background: 'rgba(10, 15, 24, 0.6)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(56, 75, 102, 0.3)' }}>
          <span style={{ fontSize: '9px', color: '#64748b', display: 'block', fontFamily: 'var(--font-mono)' }}>LATITUDE</span>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{latitude?.toFixed(6) || '12.840784'}°</span>
        </div>
        <div style={{ background: 'rgba(10, 15, 24, 0.6)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(56, 75, 102, 0.3)' }}>
          <span style={{ fontSize: '9px', color: '#64748b', display: 'block', fontFamily: 'var(--font-mono)' }}>LONGITUDE</span>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{longitude?.toFixed(6) || '80.154024'}°</span>
        </div>
        <div style={{ background: 'rgba(10, 15, 24, 0.6)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(56, 75, 102, 0.3)' }}>
          <span style={{ fontSize: '9px', color: '#64748b', display: 'block', fontFamily: 'var(--font-mono)' }}>ALTITUDE</span>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{altitude?.toFixed(1) || '20.0'} m</span>
        </div>
      </div>
    </div>
  );
}
