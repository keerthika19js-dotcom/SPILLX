import React from 'react';
import { Activity, EyeOff, Radio, Route, ShieldAlert, X, Zap } from 'lucide-react';

export default function DarkVesselCenter({ isOpen, onClose, suspects, onSimulate, isSimulating }) {
  if (!isOpen) return null;

  const darkVessels = (suspects || []).filter(vessel => vessel.has_suspicious_gap);
  const spoofVessels = (suspects || []).filter(vessel => vessel.has_spoofing_alert);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-red-700/60 bg-command-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-command-800 bg-command-950/90 px-6 py-4">
          <div className="flex items-center gap-3"><div className="rounded-lg border border-red-700 bg-red-950 p-2 text-red-300"><EyeOff className="h-5 w-5" /></div><div><h2 className="font-mono text-sm font-bold tracking-wider text-white">DARK VESSEL DETECTION CENTER</h2><p className="text-xs text-slate-400">AIS silence reconstruction and evasive-behavior analysis</p></div></div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-command-800 hover:text-white" aria-label="Close dark vessel center"><X className="h-5 w-5" /></button>
        </header>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-3 md:grid-cols-4">
            <Kpi icon={<EyeOff />} label="Dark vessels" value={darkVessels.length} tone="red" />
            <Kpi icon={<Radio />} label="Blackout gaps" value={darkVessels.reduce((total, vessel) => total + (vessel.has_suspicious_gap ? 1 : 0), 0)} tone="orange" />
            <Kpi icon={<Route />} label="Reconstructed tracks" value={darkVessels.length ? 'ACTIVE' : 'NONE'} tone="cyan" />
            <Kpi icon={<ShieldAlert />} label="Spoof alerts" value={spoofVessels.length} tone="purple" />
          </div>

          <section className="mt-5 rounded-xl border border-red-900/70 bg-red-950/20 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-red-300"><ShieldAlert className="h-4 w-4" /> BLACKOUT EVIDENCE BOARD</h3><p className="mt-1 text-[11px] text-slate-500">A dark transit is inferred when a vessel disappears during the release window and its gap segment crosses the origin zone.</p></div><button onClick={onSimulate} disabled={isSimulating} className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"><Zap className="h-4 w-4" /> {isSimulating ? 'Simulation active' : 'Simulate blackout'}</button></div>
            {darkVessels.length ? <div className="space-y-3">{darkVessels.map(vessel => <DarkCard key={vessel.mmsi} vessel={vessel} />)}</div> : <div className="rounded-lg border border-command-700 bg-command-950/60 p-6 text-center text-xs text-slate-500">No suspicious AIS blackout is currently inside the release window.</div>}
          </section>

          <section className="mt-5 grid gap-3 md:grid-cols-3"><Method icon={<Radio />} title="1. Detect silence" text="AIS transmission gaps are measured against the configured continuity threshold." /><Method icon={<Route />} title="2. Reconstruct transit" text="The missing segment is interpolated between the last and next known positions." /><Method icon={<ShieldAlert />} title="3. Score intent" text="Origin crossing, timing, vessel class, and speed behavior raise suspicion." /></section>
        </div>
      </div>
    </div>
  );
}

function DarkCard({ vessel }) {
  return <article className="rounded-xl border border-red-800/60 bg-command-950/80 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="rounded bg-red-600 px-2 py-1 font-mono text-[10px] font-bold text-white">DARK TRANSIT</span><h4 className="text-sm font-bold text-white">{vessel.vessel_name}</h4></div><p className="mt-1 text-[11px] text-slate-500">{vessel.vessel_type} · MMSI {vessel.mmsi}</p></div><div className="text-right"><div className="font-mono text-lg font-bold text-red-300">{vessel.suspicion_score}%</div><div className="text-[10px] uppercase text-slate-500">suspicion</div></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs"><div><span className="block text-slate-500">AIS silence</span><b className="text-red-200">{vessel.gap_duration_minutes || 0} minutes</b></div><div><span className="block text-slate-500">CPA to origin</span><b className="text-slate-200">{vessel.min_distance_to_origin_km} km</b></div><div><span className="block text-slate-500">Evidence status</span><b className="text-emerald-300">Cross-validated</b></div></div><div className="mt-3 border-t border-command-800 pt-3 text-xs text-slate-300">{vessel.behavior_notes?.[0] || 'Gap aligned with the reconstructed release zone.'}</div></article>;
}

function Kpi({ icon, label, value, tone }) { const colors = { red: 'text-red-300', orange: 'text-orange-300', cyan: 'text-cyan-300', purple: 'text-purple-300' }; return <div className="rounded-xl border border-command-700 bg-command-950/70 p-3"><div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider ${colors[tone]}`}>{React.cloneElement(icon, { className: 'h-4 w-4' })}{label}</div><div className="mt-2 font-mono text-xl font-bold text-white">{value}</div></div>; }
function Method({ icon, title, text }) { return <div className="rounded-xl border border-command-700 bg-command-900/60 p-4"><div className="flex items-center gap-2 text-xs font-bold text-cyan-300">{React.cloneElement(icon, { className: 'h-4 w-4' })}{title}</div><p className="mt-2 text-[11px] leading-5 text-slate-500">{text}</p></div>; }
