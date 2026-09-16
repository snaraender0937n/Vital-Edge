import React from 'react';
import { Server } from 'lucide-react';

export default function SystemStatusPanel({ system = {}, wsConnected = false }) {
  const getStatusBadge = (value) => {
    const isPositive = [
      'ONLINE', 'CONNECTED', 'RUNNING', 'ACTIVE', 'AVAILABLE', 'READY', 'VALID', 'RECEIVING'
    ].includes(value);

    const isWarning = [
      'SEARCHING', 'LEAD OFF', 'NO DATA', 'SIMULATED'
    ].includes(value);

    let bg = 'rgba(239, 68, 68, 0.15)';
    let border = 'rgba(239, 68, 68, 0.35)';
    let color = '#f87171';
    let dot = '#ef4444';

    if (isPositive) {
      bg = 'rgba(16, 185, 129, 0.15)';
      border = 'rgba(16, 185, 129, 0.35)';
      color = '#34d399';
      dot = '#10b981';
    } else if (isWarning) {
      bg = 'rgba(245, 158, 11, 0.15)';
      border = 'rgba(245, 158, 11, 0.35)';
      color = '#fbbf24';
      dot = '#f59e0b';
    }

    return (
      <span style={{
        padding: '2px 6px',
        borderRadius: '4px',
        background: bg,
        border: `1px solid ${border}`,
        color: color,
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dot }} />
        {value}
      </span>
    );
  };

  const statusItems = [
    { label: "XIAO ESP32-C3", value: system.xiao || "OFFLINE" },
    { label: "ESP-NOW LINK", value: system.esp_now || "LOST" },
    { label: "LILYGO T-SIM7670G-S3", value: system.lilygo || "OFFLINE" },
    { label: "SERIAL COM9", value: system.serial || "NOT AVAILABLE" },
    { label: "UDP (PORT 5005)", value: system.udp || "NO DATA" },
    { label: "FASTAPI BACKEND", value: system.backend || "RUNNING" },
    { label: "WEBSOCKET STREAM", value: wsConnected ? "CONNECTED" : "DISCONNECTED" },
    { label: "SQLITE DATABASE", value: system.database || "ACTIVE" },
    { label: "SIM7670G GNSS", value: system.gnss || "SEARCHING" },
    { label: "SIM7670G LTE", value: system.lte || "READY" },
    { label: "MAX30102 SENSOR", value: system.max30102 || "UNAVAILABLE" },
    { label: "MPU6050 SENSOR", value: system.mpu6050 || "UNAVAILABLE" },
    { label: "DS18B20 SENSOR", value: system.ds18b20 || "UNAVAILABLE" },
    { label: "AD8232 ECG", value: system.ecg || "UNAVAILABLE" },
    { label: "PM2.5 SIMULATOR", value: "SIMULATED" },
  ];

  return (
    <div className="tactical-card" style={{ padding: '14px 16px' }}>
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '8px',
        marginBottom: '10px',
        borderBottom: '1px solid rgba(56, 75, 102, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server style={{ width: '15px', height: '15px', color: '#22d3ee' }} />
          <h2 className="font-tactical" style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', letterSpacing: '0.08em' }}>
            SUBSYSTEM INTEGRITY & HARDWARE TELEMETRY MATRIX
          </h2>
        </div>
        <span className="font-mono" style={{ fontSize: '10px', color: '#64748b' }}>
          15 SUBSYSTEM CHANNELS
        </span>
      </div>

      {/* Grid of 15 Subsystems */}
      <div className="grid-matrix-15">
        {statusItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(10, 15, 24, 0.65)',
              border: '1px solid rgba(56, 75, 102, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span className="font-mono" style={{ fontSize: '10px', color: '#94a3b8' }}>
              {item.label}
            </span>
            {getStatusBadge(item.value)}
          </div>
        ))}
      </div>
    </div>
  );
}
