import React from 'react';
import { ArrowRight, Crosshair, FileCheck2, Radar, ShieldAlert, Waves } from 'lucide-react';

export default function MissionOverview({ scenarios, currentScenario, onSelectScenario, spill, drift, suspects, onOpenBrief, onOpenInvestigation }) {
  const topSuspect = suspects?.[0];
  return (
    <main className="flex-1 overflow-y-auto bg-command-950 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400"><Radar className="h-4 w-4" /> SIH26143 / Mission Control</div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">Turn satellite evidence into action.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">SPILLX fuses SAR segmentation, reverse drift reconstruction, and AIS behavior analysis into one explainable maritime enforcement workflow.</p>
          </div>
          <button onClick={onOpenInvestigation} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-950/40 hover:bg-cyan-500"><Crosshair className="h-4 w-4" /> Open live investigation</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Waves />} label="Detected slick" value={`${spill?.area_km2 ?? 0} km²`} accent="text-cyan-300" />
          <Metric icon={<Radar />} label="SAR confidence" value={`${spill?.confidence ?? 0}%`} accent="text-emerald-300" />
          <Metric icon={<Crosshair />} label="Origin estimate" value={`${drift?.drift_hours ?? 0}h back`} accent="text-orange-300" />
          <Metric icon={<ShieldAlert />} label="Top suspicion" value={topSuspect ? `${topSuspect.suspicion_score}%` : 'Pending'} accent="text-red-300" />
        </div>

        <section className="mt-6 rounded-2xl border border-command-700 bg-command-900/70 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-mono text-sm font-bold tracking-wider text-white">SCENARIO LAB</h2><p className="mt-1 text-xs text-slate-500">Choose the investigation you want to present.</p></div><span className="font-mono text-[10px] text-cyan-400">{scenarios.length} CASE FILES</span></div>
          <div className="grid gap-3 md:grid-cols-3">
            {scenarios.map(scenario => {
              const active = scenario.id === currentScenario;
              return <button key={scenario.id} onClick={() => onSelectScenario(scenario.id)} className={`group min-h-32 rounded-xl border p-4 text-left transition ${active ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/30' : 'border-command-700 bg-command-950/70 hover:border-cyan-700'}`}><div className="mb-5 flex items-center justify-between"><span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-cyan-300 shadow-[0_0_12px_#67e8f9]' : 'bg-command-700'}`} /><ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" /></div><div className="text-sm font-bold text-white">{scenario.title}</div><div className="mt-2 text-[11px] leading-5 text-slate-500">{scenario.subtitle || 'Scenario-specific satellite and AIS evidence package'}</div></button>;
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border border-command-700 bg-command-900/60 p-5"><div className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300"><FileCheck2 className="h-4 w-4" /> WHY SPILLX STANDS OUT</div><div className="grid gap-3 sm:grid-cols-3"><Feature title="Physics-aware" text="Reverse drift traces the release zone instead of guessing from proximity." /><Feature title="Explainable AI" text="Every suspicion score exposes proximity, timing, gap, and anomaly factors." /><Feature title="Court-ready" text="Reports and evidence exports preserve an auditable chain of custody." /></div></section>
          <section className="rounded-2xl border border-red-900/60 bg-red-950/20 p-5"><div className="text-[10px] font-mono uppercase tracking-widest text-red-300">Current lead</div><div className="mt-3 text-2xl font-bold text-white">{topSuspect?.vessel_name || 'No suspect loaded'}</div><div className="mt-1 text-xs text-slate-400">{topSuspect ? `${topSuspect.vessel_type} · ${topSuspect.suspicion_score}% suspicion` : 'Load a scenario to begin'}</div><button onClick={onOpenBrief} className="mt-5 rounded-lg border border-red-700 bg-red-950/60 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-900">Open judge brief</button></section>
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, label, value, accent }) { return <div className="rounded-xl border border-command-700 bg-command-900 p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500">{React.cloneElement(icon, { className: 'h-4 w-4 text-cyan-400' })}{label}</div><div className={`mt-3 font-mono text-2xl font-bold ${accent}`}>{value}</div></div>; }
function Feature({ title, text }) { return <div><div className="text-xs font-bold text-slate-200">{title}</div><div className="mt-1 text-[11px] leading-5 text-slate-500">{text}</div></div>; }
