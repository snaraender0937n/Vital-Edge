import React from 'react';
import { Activity, Radio, Cpu, Settings, ExternalLink } from 'lucide-react';

export default function Header({ state, wsConnected, onOpenSerialSetup, onRefreshHistory }) {
  const commState = state.communication_state || 'NO LIVE TELEMETRY';
  const isLive = commState === 'LIVE';
  const isStale = commState === 'STALE DATA';
  const isOffline = commState === 'NO LIVE TELEMETRY';

  const serialStatus = state.system?.serial || 'NOT AVAILABLE';
  const isSerialConnected = serialStatus === 'CONNECTED';

  return (
    <header className="tactical-card p-3.5 mb-3 flex flex-col md:flex-row items-center justify-between gap-3 border-b border-cyan-500/30">
      {/* Brand & Unit Identifier */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-tactical tracking-wider text-white">
              VITAL<span className="text-cyan-400">EDGE</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-cyan-300 font-mono font-semibold">
              SOLDIER HEALTH HUD
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            TACTICAL TELEMETRY // UNIT: <strong className="text-cyan-300 font-bold">{state.device || 'VITALEDGE-001'}</strong>
          </p>
        </div>
      </div>

      {/* Control Badges & COM9 Connection Trigger */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Interactive COM9 Serial Port Badge */}
        <button
          onClick={onOpenSerialSetup}
          className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
            isSerialConnected
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
          }`}
          title="Click to configure or scan serial COM ports"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>SERIAL COM9: <strong>{serialStatus}</strong></span>
          <Settings className="w-3 h-3 opacity-60 ml-0.5" />
        </button>

        {/* Input Path */}
        {state.data_source && (
          <div className="px-3 py-1.5 rounded-md text-xs font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            <span>VIA {state.data_source}</span>
          </div>
        )}

        {/* Telemetry Freshness Badge */}
        <div className={`px-3 py-1.5 rounded-md text-xs font-tactical font-bold flex items-center gap-2 ${
          isLive ? 'badge-live' : isStale ? 'badge-stale' : 'badge-offline'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isLive ? 'bg-emerald-400 animate-ping' : isStale ? 'bg-amber-400' : 'bg-slate-400'
          }`} />
          <span>{commState}</span>
          {state.age_seconds !== null && state.age_seconds !== undefined && isLive && (
            <span className="font-mono text-[10px] opacity-80">({state.age_seconds}s)</span>
          )}
        </div>

        {/* WebSocket health indicator */}
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            wsConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'
          }`}
          title={wsConnected ? "WebSocket Connected (localhost:8000)" : "WebSocket Disconnected"}
        />
      </div>
    </header>
  );
}
