import React from 'react';
import { Activity, Download, FileCheck2, ShieldAlert, Target, X } from 'lucide-react';

export default function JudgeBriefModal({ isOpen, onClose, scenario, spill, drift, suspects, onExportEvidence }) {
  if (!isOpen) return null;

  const topSuspect = suspects?.[0];
  const evidenceCount = (topSuspect?.behavior_notes?.length || 0) + (topSuspect?.has_suspicious_gap ? 1 : 0) + (topSuspect?.has_spoofing_alert ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cyan-700/60 bg-command-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-command-800 bg-command-950/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-cyan-700 bg-cyan-950 p-2 text-cyan-300"><FileCheck2 className="h-5 w-5" /></div>
            <div>
              <h2 className="font-mono text-sm font-bold tracking-wider text-white">SIH JUDGE BRIEF</h2>
              <p className="text-xs text-slate-400">Explainable maritime forensic investigation summary</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-command-800 hover:text-white" aria-label="Close judge brief"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-1 text-[10px] font-mono uppercase tracking-widest text-cyan-400">Active investigation</div>
              <h3 className="text-xl font-bold text-white">{scenario?.title || 'Maritime oil spill incident'}</h3>
            </div>
            <div className="rounded-lg border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400">Pipeline status</div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-200"><Activity className="h-3.5 w-3.5" /> ANALYSIS COMPLETE</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="SAR area" value={`${spill?.area_km2 ?? 0} km²`} />
            <Metric label="Confidence" value={`${spill?.confidence ?? 0}%`} />
            <Metric label="Drift back" value={`${drift?.drift_hours ?? 0} hours`} />
            <Metric label="Candidates" value={`${suspects?.length ?? 0}`} />
          </div>

          {topSuspect && (
            <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_1fr]">
              <section className="rounded-xl border border-red-800/70 bg-red-950/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold tracking-wider text-red-300"><ShieldAlert className="h-4 w-4" /> PRIMARY SUSPECT</span>
                  <span className="rounded bg-red-600 px-2 py-1 font-mono text-xs font-bold text-white">{topSuspect.suspicion_score}%</span>
                </div>
                <div className="text-lg font-bold text-white">{topSuspect.vessel_name}</div>
                <div className="mt-1 text-xs text-slate-400">{topSuspect.vessel_type} · MMSI {topSuspect.mmsi}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><span className="block text-slate-500">CPA to origin</span><b className="text-slate-200">{topSuspect.min_distance_to_origin_km} km</b></div>
                  <div><span className="block text-slate-500">Evidence flags</span><b className="text-red-300">{evidenceCount} detected</b></div>
                </div>
              </section>
              <section className="rounded-xl border border-command-700 bg-command-950/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300"><Target className="h-4 w-4" /> WHY THIS VESSEL</div>
                <div className="space-y-2 text-xs text-slate-300">
                  {(topSuspect.behavior_notes || ['Track aligned with the probable origin zone']).slice(0, 4).map((note, index) => (
                    <div key={index} className="flex gap-2"><span className="font-mono text-cyan-400">0{index + 1}</span><span>{note}</span></div>
                  ))}
                </div>
              </section>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-command-700 bg-command-950/60 p-4 text-xs text-slate-400">
            <div className="mb-2 font-mono font-bold tracking-wider text-slate-200">CHAIN OF CUSTODY CHECK</div>
            <div className="grid gap-2 md:grid-cols-3">
              <span>Satellite: <b className="text-slate-200">{spill?.sensor || 'SAR scene'}</b></span>
              <span>Origin window: <b className="text-slate-200">{drift?.estimated_release_start?.substring(11, 16)} - {drift?.estimated_release_end?.substring(11, 16)} UTC</b></span>
              <span>Scoring: <b className="text-emerald-300">Explainable 4-factor model</b></span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-command-800 bg-command-950/90 px-6 py-3">
          <button onClick={onClose} className="rounded-lg bg-command-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-command-700">Close</button>
          <button onClick={onExportEvidence} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500"><Download className="h-4 w-4" /> Export Evidence JSON</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-lg border border-command-800 bg-command-950/80 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 font-mono text-lg font-bold text-cyan-300">{value}</div></div>;
}
