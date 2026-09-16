import React, { useRef, useEffect } from 'react';
import { HeartPulse, AlertTriangle } from 'lucide-react';

export default function EcgMonitor({ ecgPoint, leadsOff, isLive }) {
  const canvasRef = useRef(null);
  const dataPointsRef = useRef(new Array(200).fill(0));
  const sweepIndexRef = useRef(0);

  useEffect(() => {
    if (!isLive) return;
    if (ecgPoint !== null && ecgPoint !== undefined) {
      const buffer = dataPointsRef.current;
      const idx = sweepIndexRef.current;
      buffer[idx] = ecgPoint;
      sweepIndexRef.current = (idx + 1) % buffer.length;
    }
  }, [ecgPoint, isLive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;
      
      ctx.fillStyle = '#05080e';
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const buffer = dataPointsRef.current;
      const totalPoints = buffer.length;
      const stepX = width / (totalPoints - 1);
      const sweepX = sweepIndexRef.current * stepX;

      if (!isLive) {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();
      } else {
        ctx.strokeStyle = leadsOff ? '#f59e0b' : '#06b6d4';
        ctx.shadowColor = leadsOff ? 'rgba(245, 158, 11, 0.6)' : 'rgba(6, 182, 212, 0.8)';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.2;
        ctx.beginPath();

        for (let i = 0; i < totalPoints; i++) {
          const val = buffer[i];
          const y = midY - (val * (height * 0.35));
          const x = i * stepX;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sweepX, 0);
        ctx.lineTo(sweepX, height);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLive, leadsOff]);

  return (
    <div className="tactical-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeartPulse style={{ width: '16px', height: '16px', color: isLive ? '#22d3ee' : '#64748b' }} />
          <span className="font-tactical" style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.08em' }}>
            ECG SIGNAL // AD8232 HARDWARE STREAM
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {leadsOff && isLive && (
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              color: '#fcd34d',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <AlertTriangle style={{ width: '12px', height: '12px' }} /> LEAD OFF
            </span>
          )}
          <span className="font-mono" style={{ fontSize: '11px', color: '#94a3b8' }}>
            {isLive ? `VAL: ${ecgPoint !== null && ecgPoint !== undefined ? ecgPoint.toFixed(2) : '--'} mV` : 'NO LIVE HARDWARE'}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="ecg-canvas-wrap" style={{ flex: 1, minHeight: '120px', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={700}
          height={140}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {!isLive && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <p className="font-mono" style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                ECG UNAVAILABLE
              </p>
              <p className="font-mono" style={{ fontSize: '10px', color: '#64748b' }}>
                Awaiting physical hardware signal from XIAO / LilyGO
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '8px',
        paddingTop: '6px',
        borderTop: '1px solid rgba(56, 75, 102, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: '#64748b'
      }}>
        <span>CALIBRATION: 1 mV = 10 mm</span>
        <span>SOURCE: XIAO ESP32-C3 ESP-NOW</span>
      </div>
    </div>
  );
}
