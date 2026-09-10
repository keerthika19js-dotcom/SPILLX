import React, { useState } from 'react';
import { 
  Wind, Waves, Compass, Clock, RotateCcw, 
  Play, MapPin, RefreshCw, AlertOctagon 
} from 'lucide-react';

export default function DriftControlPanel({
  drift,
  onRunDrift,
  loading,
}) {
  const [windSpeed, setWindSpeed] = useState(12.0);
  const [windDir, setWindDir] = useState(220.0);
  const [currSpeed, setCurrSpeed] = useState(0.8);
  const [currDir, setCurrDir] = useState(65.0);
  const [driftHours, setDriftHours] = useState(8.0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onRunDrift({
      wind_speed_knots: windSpeed,
      wind_direction_deg: windDir,
      current_speed_knots: currSpeed,
      current_direction_deg: currDir,
      drift_hours: driftHours,
    });
  };

  return (
    <div className="bg-command-900 border border-command-700/60 rounded-xl p-4 shadow-xl flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-command-800">
        <div className="flex items-center space-x-2">
          <Wind className="w-4 h-4 text-orange-400" />
          <h2 className="text-xs font-bold font-mono text-slate-100 tracking-wider">
            LAGRANGIAN DRIFT & ORIGIN ESTIMATION
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800/60">
          REVERSE RECONSTRUCTION
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Wind Inputs */}
        <div className="bg-command-950/70 border border-command-800 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center space-x-1.5">
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              <span>10m Surface Wind:</span>
            </span>
            <span className="font-mono text-cyan-300">{windSpeed} kt @ {windDir}°</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Speed (kt):</label>
              <input
                type="number"
                min="0"
                max="60"
                step="0.5"
                value={windSpeed}
                onChange={e => setWindSpeed(parseFloat(e.target.value) || 0)}
                className="w-full bg-command-900 border border-command-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Direction (from):</label>
              <input
                type="number"
                min="0"
                max="360"
                step="5"
                value={windDir}
                onChange={e => setWindDir(parseFloat(e.target.value) || 0)}
                className="w-full bg-command-900 border border-command-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Ocean Current Inputs */}
        <div className="bg-command-950/70 border border-command-800 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center space-x-1.5">
              <Waves className="w-3.5 h-3.5 text-blue-400" />
              <span>Ocean Surface Current:</span>
            </span>
            <span className="font-mono text-blue-300">{currSpeed} kt @ {currDir}°</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Speed (kt):</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={currSpeed}
                onChange={e => setCurrSpeed(parseFloat(e.target.value) || 0)}
                className="w-full bg-command-900 border border-command-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Direction (towards):</label>
              <input
                type="number"
                min="0"
                max="360"
                step="5"
                value={currDir}
                onChange={e => setCurrDir(parseFloat(e.target.value) || 0)}
                className="w-full bg-command-900 border border-command-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Drift Hours Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Backward Drift Time:</span>
            <span className="font-mono text-orange-400 font-bold">{driftHours} Hours</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="24.0"
            step="0.5"
            value={driftHours}
            onChange={e => setDriftHours(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-command-950 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        {/* Run Simulation Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-1.5 bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg shadow-md transition active:scale-98 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Simulate Backward Trajectory</span>
        </button>
      </form>

      {/* Drift Estimation Findings */}
      {drift && (
        <div className="bg-command-950/80 border border-orange-800/40 rounded-lg p-2.5 text-xs space-y-2">
          <div className="text-[10px] text-orange-400 font-mono font-bold tracking-wider uppercase flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>Estimated Origin Parameters</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Net Drift Vector:</span>
              <span className="font-mono font-bold text-slate-200">
                {drift.net_drift_vector_knots} kt @ {drift.net_drift_bearing_deg}°
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Dispersion Spread:</span>
              <span className="font-mono font-bold text-slate-200">
                ±{drift.dispersion_radius_km} km
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-command-800">
            <span className="text-slate-400 block text-[10px]">Probable Release Time Window:</span>
            <div className="font-mono text-orange-300 font-semibold text-[11px] mt-0.5">
              {drift.estimated_release_start.substring(11, 16)} to {drift.estimated_release_end.substring(11, 16)} UTC
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
