import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Activity, 
  Thermometer, 
  Gauge, 
  ShieldAlert, 
  Database,
  Radio,
  Layers,
  Settings,
  Cpu
} from 'lucide-react';

import Header from './components/Header';
import VitalCard from './components/VitalCard';
import EcgMonitor from './components/EcgMonitor';
import GpsMap from './components/GpsMap';
import EnvironmentalCard from './components/EnvironmentalCard';
import SystemStatusPanel from './components/SystemStatusPanel';
import SosAlertBanner from './components/SosAlertBanner';
import HistoryDrawer from './components/HistoryDrawer';
import SerialSetupModal from './components/SerialSetupModal';

const INITIAL_STATE = {
  device: "VITALEDGE-001",
  communication_state: "NO LIVE TELEMETRY",
  last_seen: null,
  age_seconds: null,
  data_source: null,
  hr: null,
  bpm: null,
  spo2: null,
  temperature: null,
  tempDrift: null,
  movement: null,
  ecg: null,
  leadsOff: false,
  riskScore: null,
  riskLevel: null,
  sos: false,
  buzzer: false,
  latitude: 12.840784,
  longitude: 80.154024,
  altitude: 20.0,
  satellites: 0,
  gpsFix: false,
  gpsSource: "fallback_vit_chennai",
  locationLabel: "GPS VIT Chennai",
  pm25: 28.0,
  pm25Status: "GOOD",
  system: {
    xiao: "OFFLINE",
    esp_now: "LOST",
    lilygo: "OFFLINE",
    serial: "NOT AVAILABLE",
    udp: "NO DATA",
    backend: "RUNNING",
    websocket: "CONNECTED",
    database: "ACTIVE",
    gnss: "SEARCHING",
    lte: "READY",
    max30102: "UNAVAILABLE",
    mpu6050: "UNAVAILABLE",
    ds18b20: "UNAVAILABLE",
    ecg: "UNAVAILABLE",
    pm25: "SIMULATED"
  }
};

export default function App() {
  const [telemetry, setTelemetry] = useState(INITIAL_STATE);
  const [wsConnected, setWsConnected] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [serialModalOpen, setSerialModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('hud');
  const wsRef = useRef(null);

  useEffect(() => {
    let reconnectTimeout = null;
    let isMounted = true;

    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://${window.location.hostname}:8000/ws/telemetry`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            setTelemetry(data);
          } catch (err) {
            console.error("[VitalEdge] Error parsing telemetry:", err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connectWebSocket, 2000);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const isLive = telemetry.communication_state === 'LIVE';
  const isOffline = telemetry.communication_state === 'NO LIVE TELEMETRY';

  const handleAcknowledgeSos = async () => {
    try {
      await fetch('http://localhost:8000/api/emergency/1/ack', { method: 'POST' });
    } catch (e) {
      console.warn("Error acknowledging emergency event:", e);
    }
  };

  const getRiskColor = (level) => {
    if (level === 'HIGH') return 'rose';
    if (level === 'WARNING') return 'amber';
    if (level === 'NORMAL') return 'emerald';
    return 'slate';
  };

  return (
    <div className="dashboard-container">
      {/* 1. Master Header */}
      <Header 
        state={telemetry} 
        wsConnected={wsConnected}
        onOpenSerialSetup={() => setSerialModalOpen(true)}
        onRefreshHistory={() => setHistoryOpen(true)}
      />

      {/* 2. SOS Emergency Distress Banner (Appears when active) */}
      <SosAlertBanner
        active={telemetry.sos}
        deviceId={telemetry.device}
        latitude={telemetry.latitude}
        longitude={telemetry.longitude}
        onAcknowledge={handleAcknowledgeSos}
      />

      {/* 3. Navigation Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('hud')}
            className={`font-tactical ${activeTab === 'hud' ? 'active-tab' : ''}`}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: activeTab === 'hud' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(13, 19, 30, 0.7)',
              color: activeTab === 'hud' ? '#22d3ee' : '#94a3b8',
              border: `1px solid ${activeTab === 'hud' ? 'rgba(6, 182, 212, 0.5)' : 'rgba(56, 75, 102, 0.4)'}`,
              boxShadow: activeTab === 'hud' ? '0 0 12px rgba(6, 182, 212, 0.2)' : 'none'
            }}
          >
            <Layers style={{ width: '14px', height: '14px' }} />
            OPERATIONAL HUD
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`font-tactical ${activeTab === 'system' ? 'active-tab' : ''}`}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: activeTab === 'system' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(13, 19, 30, 0.7)',
              color: activeTab === 'system' ? '#22d3ee' : '#94a3b8',
              border: `1px solid ${activeTab === 'system' ? 'rgba(6, 182, 212, 0.5)' : 'rgba(56, 75, 102, 0.4)'}`,
              boxShadow: activeTab === 'system' ? '0 0 12px rgba(6, 182, 212, 0.2)' : 'none'
            }}
          >
            <Radio style={{ width: '14px', height: '14px' }} />
            SYSTEM DIAGNOSTICS
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setSerialModalOpen(true)}
            className="font-tactical"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(6, 182, 212, 0.1)',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              color: '#67e8f9',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Cpu style={{ width: '13px', height: '13px' }} />
            PORT SETUP (COM9)
          </button>

          <button
            onClick={() => setHistoryOpen(true)}
            className="font-tactical"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(13, 19, 30, 0.7)',
              border: '1px solid rgba(56, 75, 102, 0.4)',
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Database style={{ width: '13px', height: '13px', color: '#22d3ee' }} />
            SQLITE LOGS
          </button>
        </div>
      </div>

      {/* 4. MAIN OPERATIONAL HUD VIEW */}
      {activeTab === 'hud' && (
        <main>
          {/* ROW 1: 5 KEY VITAL CARDS SPREAD HORIZONTALLY */}
          <section className="grid-vitals-5">
            <VitalCard
              title="HEART RATE"
              value={telemetry.hr}
              unit="BPM"
              subtext={telemetry.hr ? (telemetry.hr > 100 ? "ELEVATED BPM" : "RESTING NORMAL") : "AWAITING MAX30102"}
              icon={Heart}
              statusColor={telemetry.hr > 100 ? "amber" : "emerald"}
              offline={isOffline}
            />
            <VitalCard
              title="BLOOD OXYGEN"
              value={telemetry.spo2}
              unit="%"
              subtext={telemetry.spo2 ? (telemetry.spo2 < 95 ? "HYPOXIA WARNING" : "OPTIMAL SATURATION") : "AWAITING MAX30102"}
              icon={Activity}
              statusColor={telemetry.spo2 && telemetry.spo2 < 95 ? "rose" : "cyan"}
              offline={isOffline}
            />
            <VitalCard
              title="CORE TEMPERATURE"
              value={telemetry.temperature}
              unit="°C"
              subtext={telemetry.tempDrift !== null && telemetry.tempDrift !== undefined ? `DRIFT: ${telemetry.tempDrift > 0 ? '+' : ''}${telemetry.tempDrift}°C` : "AWAITING DS18B20"}
              icon={Thermometer}
              statusColor={telemetry.temperature && (telemetry.temperature > 38.0 || telemetry.temperature < 35.5) ? "rose" : "emerald"}
              offline={isOffline}
            />
            <VitalCard
              title="MOVEMENT / ACCEL"
              value={telemetry.movement}
              unit="m/s²"
              subtext={telemetry.movement !== null && telemetry.movement !== undefined ? (telemetry.movement > 8.0 ? "TACTICAL RUN / ENGAGE" : "STATIONARY / PATROL") : "AWAITING MPU6050"}
              icon={Gauge}
              statusColor={telemetry.movement && telemetry.movement > 10.0 ? "amber" : "cyan"}
              offline={isOffline}
            />
            <VitalCard
              title="PHYSIOLOGICAL RISK"
              value={telemetry.riskScore}
              unit="PTS"
              subtext={telemetry.riskLevel ? `STATUS: ${telemetry.riskLevel}` : "AWAITING TELEMETRY"}
              icon={ShieldAlert}
              statusColor={getRiskColor(telemetry.riskLevel)}
              alert={telemetry.riskLevel === 'HIGH'}
              offline={isOffline}
            />
          </section>

          {/* ROW 2: ECG OSCILLOSCOPE (2fr) + PM2.5 ENVIRONMENTAL SENSOR (1fr) */}
          <section className="grid-ecg-env">
            <EcgMonitor
              ecgPoint={telemetry.ecg}
              leadsOff={telemetry.leadsOff}
              isLive={isLive}
            />
            <EnvironmentalCard
              pm25Value={telemetry.pm25}
              pm25Status={telemetry.pm25Status}
            />
          </section>

          {/* ROW 3: GPS RADAR MAP (VIT CHENNAI FALLBACK / REAL GNSS) */}
          <section>
            <GpsMap
              latitude={telemetry.latitude}
              longitude={telemetry.longitude}
              altitude={telemetry.altitude}
              satellites={telemetry.satellites}
              gpsFix={telemetry.gpsFix}
              gpsSource={telemetry.gpsSource}
              locationLabel={telemetry.locationLabel}
            />
          </section>

          {/* ROW 4: 15-CHANNEL SUBSYSTEM STATUS INTEGRITY MATRIX */}
          <section>
            <SystemStatusPanel
              system={telemetry.system}
              wsConnected={wsConnected}
            />
          </section>
        </main>
      )}

      {/* 5. DIAGNOSTICS VIEW */}
      {activeTab === 'system' && (
        <main>
          <div style={{ marginBottom: '14px' }}>
            <SystemStatusPanel
              system={telemetry.system}
              wsConnected={wsConnected}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            <div className="tactical-card" style={{ padding: '16px' }}>
              <h3 className="font-tactical" style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
                HARDWARE TELEMETRY PIPELINE
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                <div style={{ background: 'rgba(10, 15, 24, 0.7)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(56, 75, 102, 0.3)' }}>
                  <strong style={{ color: '#22d3ee' }}>1. PHYSICAL SENSORS:</strong> MAX30102 (HR/SpO2), MPU6050 (Motion), DS18B20 (Temp), AD8232 (ECG), SOS Button
                </div>
                <div style={{ background: 'rgba(10, 15, 24, 0.7)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(56, 75, 102, 0.3)' }}>
                  <strong style={{ color: '#22d3ee' }}>2. XIAO ESP32-C3:</strong> Reads sensors, calculates physiological risk, transmits via ESP-NOW
                </div>
                <div style={{ background: 'rgba(10, 15, 24, 0.7)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(56, 75, 102, 0.3)' }}>
                  <strong style={{ color: '#22d3ee' }}>3. LILYGO T-SIM7670G-S3:</strong> Receives ESP-NOW, queries SIM7670G GNSS, outputs JSON line to COM9 & UDP :5005
                </div>
                <div style={{ background: 'rgba(10, 15, 24, 0.7)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(56, 75, 102, 0.3)' }}>
                  <strong style={{ color: '#22d3ee' }}>4. FASTAPI BACKEND:</strong> Ingests COM9 serial stream, parses JSON, writes to SQLite, pushes to WebSocket
                </div>
              </div>
            </div>

            <div className="tactical-card" style={{ padding: '16px' }}>
              <h3 className="font-tactical" style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
                TELEMETRY PROTOCOL SCHEMA
              </h3>
              <pre style={{
                background: '#04070d',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: '#67e8f9',
                overflowX: 'auto',
                lineHeight: 1.5
              }}>
{`{
  "device": "VITALEDGE-001",
  "bpm": 68.0,
  "hr": 68.0,
  "spo2": 99.0,
  "temperature": 36.40,
  "movement": 6.40,
  "tempDrift": 0.020,
  "ecg": 0.120,
  "leadsOff": false,
  "riskScore": 21.0,
  "riskLevel": "NORMAL",
  "sos": false,
  "buzzer": false,
  "latitude": 12.840784,
  "longitude": 80.154024,
  "altitude": 20.0,
  "satellites": 0,
  "gpsFix": false
}`}
              </pre>
            </div>
          </div>
        </main>
      )}

      {/* 6. Tactical Footer */}
      <footer style={{
        marginTop: '16px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(56, 75, 102, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '11px',
        fontFamily: 'var(--font-mono)',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22d3ee' }} />
          <span>VITALEDGE SOLDIER MONITORING // VIT CHENNAI HARDWARE DEMONSTRATION</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>PORT: <strong>COM9 @ 115200 BAUD</strong></span>
          <span>•</span>
          <span>UDP: <strong>5005</strong></span>
          <span>•</span>
          <span>SQLITE: <strong>ACTIVE</strong></span>
        </div>
      </footer>

      {/* Persistent History Drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Hardware Serial Port Setup Modal */}
      <SerialSetupModal
        isOpen={serialModalOpen}
        onClose={() => setSerialModalOpen(false)}
        currentPort="COM9"
      />
    </div>
  );
}
