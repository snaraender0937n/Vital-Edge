import React, { useState, useEffect } from 'react';
import { Database, Clock, RefreshCw, X, ShieldAlert } from 'lucide-react';

export default function HistoryDrawer({ isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' or 'emergency'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resHist, resEmerg] = await Promise.all([
        fetch('http://localhost:8000/api/history?limit=50'),
        fetch('http://localhost:8000/api/emergency?limit=50')
      ]);
      const dataHist = await resHist.json();
      const dataEmerg = await resEmerg.json();
      setHistory(dataHist.history || []);
      setEmergencyEvents(dataEmerg.events || []);
    } catch (err) {
      console.error("Failed to fetch historical data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-[#090d16] border-l border-cyan-500/30 h-full flex flex-col p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold font-tactical tracking-wider text-white">
                SQLITE PERSISTENT TELEMETRY STORE // 24H RETENTION
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Auditable hardware sensor records from XIAO & LilyGO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 my-4">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-3 py-1.5 rounded-md text-xs font-tactical font-semibold tracking-wider ${
              activeTab === 'telemetry'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            TELEMETRY LOGS ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`px-3 py-1.5 rounded-md text-xs font-tactical font-semibold tracking-wider ${
              activeTab === 'emergency'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            EMERGENCY / SOS EVENTS ({emergencyEvents.length})
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'telemetry' ? (
            history.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                No telemetry persisted yet. Connect LilyGO COM9 or UDP to record live records.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                    <th className="p-2">TIME</th>
                    <th className="p-2">HR</th>
                    <th className="p-2">SPO2</th>
                    <th className="p-2">TEMP</th>
                    <th className="p-2">RISK</th>
                    <th className="p-2">SOURCE</th>
                    <th className="p-2">GPS FIX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-2 text-slate-400">
                        {new Date(row.timestamp * 1000).toLocaleTimeString()}
                      </td>
                      <td className="p-2 text-cyan-300 font-semibold">{row.hr ?? '--'}</td>
                      <td className="p-2 text-emerald-300">{row.spo2 ? `${row.spo2}%` : '--'}</td>
                      <td className="p-2 text-slate-300">{row.temperature ? `${row.temperature}°C` : '--'}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          row.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400' :
                          row.risk_level === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {row.risk_level || 'NORMAL'}
                        </span>
                      </td>
                      <td className="p-2 text-slate-400 uppercase">{row.data_source || 'COM9'}</td>
                      <td className="p-2">
                        {row.gps_fix ? (
                          <span className="text-emerald-400">GNSS</span>
                        ) : (
                          <span className="text-slate-500">VIT CHENNAI</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            emergencyEvents.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                No emergency events recorded in database.
              </div>
            ) : (
              <div className="space-y-2">
                {emergencyEvents.map((ev, i) => (
                  <div key={i} className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-tactical font-bold text-rose-200">
                          {ev.event_type}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-1">
                        Time: {new Date(ev.timestamp * 1000).toLocaleString()} • Device: {ev.device_id}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500">
                        Coord: {ev.latitude?.toFixed(6)}, {ev.longitude?.toFixed(6)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      {ev.acknowledged ? 'ACKNOWLEDGED' : 'RECORDED'}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
