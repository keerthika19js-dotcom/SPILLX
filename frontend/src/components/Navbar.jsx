import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Radio, Compass, FileText, Layers, 
  HelpCircle, Activity, ChevronLeft, ChevronRight, RefreshCw, Presentation
} from 'lucide-react';

export default function Navbar({ 
  scenarios, 
  currentScenario, 
  onSelectScenario, 
  activeTab, 
  setActiveTab, 
  onOpenReport,
  onOpenBrief,
  loading,
  onScenarioStep,
  scenarioPosition
}) {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-command-900 border-b border-command-700/60 px-4 flex items-center justify-between z-30 shrink-0 select-none shadow-lg">
      {/* Brand & Mission Identifier */}
      <div className="flex items-center space-x-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-800 border border-cyan-400/40 shadow-md shadow-cyan-900/30">
          <Radio className="w-5 h-5 text-white animate-pulse-slow" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-command-900 animate-ping-slow"></span>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold tracking-wider text-base bg-gradient-to-r from-cyan-400 via-sky-200 to-white bg-clip-text text-transparent font-mono">
              SPILLX
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-widest bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded font-mono">
              SIH26143
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium tracking-tight">
            AI Maritime Oil Spill Detection & Vessel Correlation Platform
          </p>
        </div>
      </div>

      {/* Center Nav: Scenarios & Mode Tabs */}
      <div className="flex items-center space-x-4">
        {/* Scenario Quick Selector */}
        <div className="flex items-center space-x-2 bg-command-950/70 border border-command-700/80 rounded-lg px-2.5 py-1">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <button onClick={() => onScenarioStep(-1)} disabled={loading} className="text-slate-400 hover:text-cyan-300 disabled:opacity-40" title="Previous scenario" aria-label="Previous scenario">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-slate-400 font-medium">Scenario:</span>
          <select 
            value={currentScenario}
            onChange={(e) => onSelectScenario(e.target.value)}
            disabled={loading}
            className="bg-transparent text-xs text-cyan-200 font-semibold focus:outline-none cursor-pointer pr-2"
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id} className="bg-command-900 text-slate-200">
                {s.title}
              </option>
            ))}
          </select>
          <button onClick={() => onScenarioStep(1)} disabled={loading} className="text-slate-400 hover:text-cyan-300 disabled:opacity-40" title="Next scenario" aria-label="Next scenario">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="hidden sm:inline text-[10px] font-mono text-slate-500">{scenarioPosition}</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
        </div>

        {/* View Toggle: Investigation Dashboard vs Methodology */}
        <div className="flex bg-command-950 border border-command-700/80 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('investigation')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'investigation'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-command-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Investigation Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('methodology')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'methodology'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-command-800/50'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Methodology & AI Architecture</span>
          </button>
        </div>
      </div>

      {/* Right Controls: UTC Clock & Generate Report Button */}
      <div className="flex items-center space-x-3">
        <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-slate-400 bg-command-950/60 border border-command-800 rounded-md px-2.5 py-1">
          <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>{utcTime || 'UTC 00:00:00'}</span>
        </div>

        <button
          onClick={onOpenBrief}
          className="hidden xl:flex items-center space-x-1.5 bg-command-800 hover:bg-command-700 text-cyan-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-command-700 transition-all active:scale-95"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span>Judge Brief</span>
        </button>

        <button
          onClick={onOpenReport}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-red-400/40 shadow-md shadow-red-950/40 transition-all active:scale-95"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Generate Forensic Report</span>
        </button>
      </div>
    </header>
  );
}
