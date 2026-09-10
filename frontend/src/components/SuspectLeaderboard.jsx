import React, { useState } from 'react';
import { 
  ShieldAlert, AlertTriangle, Ship, Filter, Sliders, 
  ChevronDown, ChevronUp, Eye, EyeOff, Radio, CheckCircle2,
  Anchor, ExternalLink, Zap
} from 'lucide-react';

export default function SuspectLeaderboard({
  suspects,
  selectedVessel,
  onSelectVessel,
  weights,
  onUpdateWeights,
  onSimulateDarkVessel,
  isSimulatingDark
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [minScore, setMinScore] = useState(0);
  const [showWeights, setShowWeights] = useState(false);
  const [expandedMmsi, setExpandedMmsi] = useState(null);

  // Filter suspects
  const filteredSuspects = (suspects || []).filter(s => {
    const matchesSearch = s.vessel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.mmsi.toString().includes(searchTerm);
    const matchesType = typeFilter === 'ALL' || 
                        (typeFilter === 'TANKER' && s.vessel_type.toLowerCase().includes('tanker')) ||
                        (typeFilter === 'CARGO' && (s.vessel_type.toLowerCase().includes('cargo') || s.vessel_type.toLowerCase().includes('container'))) ||
                        (typeFilter === 'OTHER' && !s.vessel_type.toLowerCase().includes('tanker') && !s.vessel_type.toLowerCase().includes('cargo'));
    const matchesScore = s.suspicion_score >= minScore;
    return matchesSearch && matchesType && matchesScore;
  });

  const getScoreBadgeClass = (score) => {
    if (score >= 75) return 'bg-red-950/80 text-red-400 border-red-800/80';
    if (score >= 45) return 'bg-amber-950/80 text-amber-400 border-amber-800/80';
    return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
  };

  const toggleExpand = (mmsi, e) => {
    e.stopPropagation();
    setExpandedMmsi(expandedMmsi === mmsi ? null : mmsi);
  };

  return (
    <div className="bg-command-900 border border-command-700/60 rounded-xl p-4 shadow-xl flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-command-800 shrink-0">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <h2 className="text-xs font-bold font-mono text-slate-100 tracking-wider">
            CULPRIT SUSPECT LEADERBOARD
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {/* Dark Vessel Live Simulation Demo Button */}
          <button
            onClick={onSimulateDarkVessel}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold border transition ${
              isSimulatingDark 
                ? 'bg-red-600 text-white border-red-400 animate-pulse' 
                : 'bg-command-950 text-slate-300 hover:text-white border-command-700'
            }`}
            title="Simulate AIS blackout scenario live during demo"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>{isSimulatingDark ? 'Dark Vessel Active' : 'Simulate Dark Vessel'}</span>
          </button>

          <button
            onClick={() => setShowWeights(!showWeights)}
            className={`p-1.5 rounded-lg border text-xs transition ${
              showWeights 
                ? 'bg-cyan-600 text-white border-cyan-500' 
                : 'bg-command-950 text-slate-400 border-command-700 hover:text-white'
            }`}
            title="Configure Scoring Weights"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Configurable Weights Drawer */}
      {showWeights && (
        <div className="bg-command-950 border border-cyan-800/50 rounded-lg p-3 my-2 text-xs space-y-2 shrink-0 animate-fadeIn">
          <div className="flex justify-between items-center text-[11px] font-mono font-bold text-cyan-400">
            <span>SCORING WEIGHT CONFIGURATION</span>
            <span className="text-slate-400 text-[10px]">Sum: 100%</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <div className="flex justify-between text-slate-300">
                <span>Proximity CPA:</span>
                <span className="font-mono text-cyan-300">{Math.round(weights.proximity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={weights.proximity}
                onChange={e => onUpdateWeights({ ...weights, proximity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-command-900 rounded appearance-none accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300">
                <span>Temporal Match:</span>
                <span className="font-mono text-cyan-300">{Math.round(weights.temporal * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={weights.temporal}
                onChange={e => onUpdateWeights({ ...weights, temporal: parseFloat(e.target.value) })}
                className="w-full h-1 bg-command-900 rounded appearance-none accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300">
                <span>AIS Gap Blackout:</span>
                <span className="font-mono text-cyan-300">{Math.round(weights.gap * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={weights.gap}
                onChange={e => onUpdateWeights({ ...weights, gap: parseFloat(e.target.value) })}
                className="w-full h-1 bg-command-900 rounded appearance-none accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300">
                <span>Behavioral Anomaly:</span>
                <span className="font-mono text-cyan-300">{Math.round(weights.anomaly * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={weights.anomaly}
                onChange={e => onUpdateWeights({ ...weights, anomaly: parseFloat(e.target.value) })}
                className="w-full h-1 bg-command-900 rounded appearance-none accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-2 gap-2 my-2 shrink-0 text-xs">
        <input
          type="text"
          placeholder="Search name or MMSI..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="bg-command-950 border border-command-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
        />

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-command-950 border border-command-700 rounded-lg px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          <option value="ALL">All Vessel Types</option>
          <option value="TANKER">Tankers (Crude/Chem)</option>
          <option value="CARGO">Cargo / Containers</option>
          <option value="OTHER">Fishing / Service</option>
        </select>
      </div>

      {/* Suspects Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-1">
        {filteredSuspects.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">
            No candidate vessels match current filter criteria.
          </div>
        ) : (
          filteredSuspects.map(suspect => {
            const isSelected = selectedVessel && selectedVessel.mmsi === suspect.mmsi;
            const isExpanded = expandedMmsi === suspect.mmsi;
            const isTop = suspect.rank === 1;

            return (
              <div
                key={suspect.mmsi}
                onClick={() => onSelectVessel(suspect)}
                className={`bg-command-950/90 rounded-xl p-3 border transition-all cursor-pointer ${
                  isSelected 
                    ? 'border-cyan-400 shadow-md shadow-cyan-950/50 bg-command-900/90 ring-1 ring-cyan-500/50' 
                    : isTop 
                    ? 'border-red-600/70 hover:border-red-500 shadow-sm' 
                    : 'border-command-800 hover:border-command-700'
                }`}
              >
                {/* Top Row: Rank, Name, Score Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                      isTop ? 'bg-red-600 text-white' : 'bg-command-800 text-slate-300'
                    }`}>
                      #{suspect.rank}
                    </span>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-white">
                          {suspect.vessel_name}
                        </span>
                        {isTop && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-red-600/80 text-white rounded font-mono font-bold tracking-wider">
                            PRIME SUSPECT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {suspect.vessel_type} | MMSI: {suspect.mmsi}
                      </div>
                    </div>
                  </div>

                  {/* Suspicion Score Badge */}
                  <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs flex items-center space-x-1 ${getScoreBadgeClass(suspect.suspicion_score)}`}>
                    <span>{suspect.suspicion_score}%</span>
                  </div>
                </div>

                {/* Second Row: Closest Approach & Flags */}
                <div className="flex items-center justify-between text-[11px] text-slate-300 mt-2 pt-2 border-t border-command-800/80">
                  <span className="text-slate-400">
                    CPA to Origin: <b className="text-slate-200">{suspect.min_distance_to_origin_km} km</b>
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {suspect.has_suspicious_gap && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950 text-red-400 border border-red-800/70 font-semibold" title="AIS blackout during release window">
                        Dark Gap
                      </span>
                    )}
                    {suspect.has_spoofing_alert && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-950 text-purple-400 border border-purple-800/70 font-semibold" title="Position spoofing detected">
                        Spoof Alert
                      </span>
                    )}
                    <button
                      onClick={(e) => toggleExpand(suspect.mmsi, e)}
                      className="p-1 hover:text-cyan-400 text-slate-400 transition"
                      title="View Explainable Score Breakdown"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Explainable Scoring Breakdown Bar */}
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-command-900 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${suspect.score_breakdown.proximity_contribution}%` }} 
                      className="bg-cyan-500 h-full" 
                      title={`Proximity: ${suspect.score_breakdown.proximity_score}% (Contrib: ${suspect.score_breakdown.proximity_contribution}%)`}
                    />
                    <div 
                      style={{ width: `${suspect.score_breakdown.temporal_contribution}%` }} 
                      className="bg-amber-500 h-full" 
                      title={`Temporal: ${suspect.score_breakdown.temporal_score}% (Contrib: ${suspect.score_breakdown.temporal_contribution}%)`}
                    />
                    <div 
                      style={{ width: `${suspect.score_breakdown.gap_contribution}%` }} 
                      className="bg-red-500 h-full" 
                      title={`AIS Gap: ${suspect.score_breakdown.gap_score}% (Contrib: ${suspect.score_breakdown.gap_contribution}%)`}
                    />
                    <div 
                      style={{ width: `${suspect.score_breakdown.anomaly_contribution}%` }} 
                      className="bg-purple-500 h-full" 
                      title={`Anomaly: ${suspect.score_breakdown.anomaly_score}% (Contrib: ${suspect.score_breakdown.anomaly_contribution}%)`}
                    />
                  </div>

                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span className="text-cyan-400">Prox {suspect.score_breakdown.proximity_contribution}%</span>
                    <span className="text-amber-400">Temp {suspect.score_breakdown.temporal_contribution}%</span>
                    <span className="text-red-400">Gap {suspect.score_breakdown.gap_contribution}%</span>
                    <span className="text-purple-400">Anom {suspect.score_breakdown.anomaly_contribution}%</span>
                  </div>
                </div>

                {/* Expanded Forensic Evidence Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-2.5 border-t border-command-800 text-[10px] space-y-2 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono">
                      <div>IMO: <span className="text-slate-200">{suspect.imo || 'N/A'}</span></div>
                      <div>Draft: <span className="text-slate-200">{suspect.draft ? suspect.draft + ' m' : 'N/A'}</span></div>
                      <div>Length: <span className="text-slate-200">{suspect.length ? suspect.length + ' m' : 'N/A'}</span></div>
                      <div>CPA Time: <span className="text-slate-200">{suspect.closest_approach_time ? suspect.closest_approach_time.substring(11, 19) + ' UTC' : 'N/A'}</span></div>
                    </div>

                    {/* Forensic Observation Notes */}
                    <div className="space-y-1 pt-1">
                      <span className="font-semibold text-slate-300 block font-sans">Forensic Findings:</span>
                      {suspect.behavior_notes && suspect.behavior_notes.map((note, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5 text-slate-300">
                          <span className="text-cyan-400 mt-0.5">•</span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
