import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, X, Check, AlertTriangle, ExternalLink, HelpCircle } from 'lucide-react';

export default function SerialSetupModal({ isOpen, onClose, currentPort, onPortChanged }) {
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState(currentPort || 'COM9');
  const [baudRate, setBaudRate] = useState(115200);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchPorts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/ports');
      const data = await res.json();
      setAvailablePorts(data.available_ports || []);
      if (data.configured_port) {
        setSelectedPort(data.configured_port);
      }
    } catch (e) {
      console.error("Error fetching serial ports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPorts();
      setStatusMsg(null);
    }
  }, [isOpen]);

  const handleApplyPort = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('http://localhost:8000/api/config/serial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort.toUpperCase().trim(), baudrate: Number(baudRate) })
      });
      const data = await res.json();
      setStatusMsg({ type: 'success', text: `Port successfully updated to ${data.serial_port} @ ${data.baud_rate} baud!` });
      if (onPortChanged) onPortChanged(data.serial_port);
    } catch (e) {
      setStatusMsg({ type: 'error', text: `Failed to update port: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isCom9Detected = availablePorts.some(p => p.port.toUpperCase() === 'COM9');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#090e17] border border-cyan-500/40 rounded-xl shadow-2xl p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-tactical tracking-wider text-white">
                HARDWARE SERIAL PORT SETUP // COM9
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Configure primary USB serial telemetry line from LilyGO T-SIM7670G-S3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* COM9 Status Banner */}
        <div className={`my-4 p-3 rounded-lg border text-xs font-mono flex items-start gap-3 ${
          isCom9Detected
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
        }`}>
          {isCom9Detected ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold font-tactical tracking-wide">
              {isCom9Detected ? 'COM9 HARDWARE PORT DETECTED' : 'COM9 NOT YET DETECTED ON WINDOWS'}
            </p>
            <p className="text-[11px] opacity-90 mt-0.5">
              {isCom9Detected
                ? 'LilyGO USB Serial port is present and ready for continuous telemetry reading.'
                : 'Plug in LilyGO T-SIM7670G-S3 USB cable, or configure port in Device Manager.'}
            </p>
          </div>
        </div>

        {/* Port Selector Form */}
        <div className="space-y-3 my-4">
          <div>
            <label className="text-xs font-tactical font-semibold text-slate-300 block mb-1">
              TARGET SERIAL PORT:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                placeholder="e.g. COM9"
                className="flex-1 px-3 py-2 rounded-lg bg-black/60 border border-slate-700 text-cyan-300 font-mono text-sm focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={fetchPorts}
                disabled={loading}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                title="Scan for connected COM ports"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                SCAN
              </button>
            </div>
          </div>

          {/* Detected Ports Quick-Select Chips */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 block mb-1.5">
              DETECTED WINDOWS COM PORTS ({availablePorts.length}):
            </span>
            {availablePorts.length === 0 ? (
              <p className="text-[11px] font-mono text-slate-500 italic p-2 rounded bg-slate-900/50">
                No active COM ports detected. Check USB connection.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availablePorts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPort(p.port)}
                    className={`px-2.5 py-1.5 rounded text-xs font-mono border transition-all flex items-center gap-1.5 ${
                      selectedPort === p.port
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <strong>{p.port}</strong>
                    <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{p.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-tactical font-semibold text-slate-300 block mb-1">
              BAUD RATE:
            </label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-black/60 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value={115200}>115200 (Default for LilyGO & XIAO)</option>
              <option value={9600}>9600</option>
              <option value={57600}>57600</option>
              <option value={921600}>921600</option>
            </select>
          </div>
        </div>

        {/* Status Feedback */}
        {statusMsg && (
          <div className={`p-2.5 rounded-lg text-xs font-mono mb-3 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-tactical font-semibold tracking-wider transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleApplyPort}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-tactical font-bold tracking-wider transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-600/30"
          >
            <Check className="w-4 h-4" />
            SAVE & CONNECT TO {selectedPort.toUpperCase()}
          </button>
        </div>

        {/* Step-by-Step Guide for Windows COM9 Assignment */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
          <div className="text-slate-200 font-bold font-tactical text-xs flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            HOW TO ASSIGN PORT TO COM9 IN WINDOWS:
          </div>
          <p>1. Plug LilyGO USB-C into laptop (ensure data-capable cable).</p>
          <p>2. Press <strong>Win + X</strong> and click <strong>Device Manager</strong>.</p>
          <p>3. Expand <strong>Ports (COM & LPT)</strong> and right-click your LilyGO serial device.</p>
          <p>4. Select <strong>Properties</strong> → <strong>Port Settings</strong> tab → <strong>Advanced...</strong></p>
          <p>5. Change <strong>COM Port Number</strong> dropdown to <strong>COM9</strong> → Click <strong>OK</strong>.</p>
        </div>
      </div>
    </div>
  );
}
