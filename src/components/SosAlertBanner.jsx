import React from 'react';
import { AlertOctagon, BellRing, Check, MapPin } from 'lucide-react';

export default function SosAlertBanner({ active, deviceId, latitude, longitude, onAcknowledge }) {
  if (!active) return null;

  return (
    <div className="mb-4 p-4 rounded-xl bg-rose-950/90 border-2 border-rose-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
      {/* Alert Title & Soldier details */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-rose-600 text-white shadow-lg shadow-rose-600/50">
          <AlertOctagon className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-tactical tracking-widest text-white">
              EMERGENCY SOS ACTIVE // SOLDIER DISTRESS BEACON
            </h2>
            <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 text-xs font-mono font-bold border border-rose-400/40">
              PRIORITY-1
            </span>
          </div>
          <p className="text-xs font-mono text-rose-200/90 flex items-center gap-3 mt-0.5">
            <span>DEVICE: <strong>{deviceId || 'VITALEDGE-001'}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-300" />
              LOCATION: {latitude?.toFixed(6)}, {longitude?.toFixed(6)} (VIT CHENNAI)
            </span>
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAcknowledge}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-tactical font-bold text-xs tracking-wider uppercase transition-colors shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          ACKNOWLEDGE SOS
        </button>
      </div>
    </div>
  );
}
