import React, { useState } from 'react';
import { 
  Satellite, Upload, Sliders, CheckCircle2, 
  AlertTriangle, RefreshCw, Eye, Image as ImageIcon 
} from 'lucide-react';

export default function SpillControlPanel({
  spill,
  onDetectSpill,
  loading,
  currentPreset,
  onSelectPreset,
}) {
  const [sensitivity, setSensitivity] = useState(0.55);
  const [activeView, setActiveView] = useState('overlay'); // 'overlay' | 'mask'
  const [customFile, setCustomFile] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCustomFile(file);
      onDetectSpill({ file, sensitivity });
    }
  };

  const handleReRun = () => {
    onDetectSpill({ file: customFile, preset: currentPreset, sensitivity });
  };

  return (
    <div className="bg-command-900 border border-command-700/60 rounded-xl p-4 shadow-xl flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-command-800">
        <div className="flex items-center space-x-2">
          <Satellite className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold font-mono text-slate-100 tracking-wider">
            SAR SPILL SEGMENTATION MODULE
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
          MARANGONI DAMPING
        </span>
      </div>

      {/* Preset or Upload Selectors */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-400 block">SAR Scene Source:</label>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={currentPreset}
            onChange={(e) => {
              setCustomFile(null);
              onSelectPreset(e.target.value);
            }}
            disabled={loading}
            className="bg-command-950 border border-command-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="gulf_of_mexico">Gulf of Mexico</option>
            <option value="singapore_strait">Singapore Strait</option>
            <option value="english_channel">English Channel</option>
          </select>

          {/* Custom File Upload Button */}
          <label className="flex items-center justify-center space-x-1.5 bg-command-950 hover:bg-command-800 border border-command-700 border-dashed rounded-lg px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate">{customFile ? customFile.name : 'Upload SAR Image'}</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Sensitivity Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">Threshold Sensitivity:</span>
          <span className="font-mono text-cyan-300 font-bold">{Math.round(sensitivity * 100)}%</span>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min="0.1"
            max="0.95"
            step="0.05"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-command-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <button
            onClick={handleReRun}
            disabled={loading}
            className="p-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg transition text-xs shadow-sm"
            title="Recalculate Segmentation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Visual Image Preview (Base64 Overlay or Binary Mask) */}
      {spill && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">SAR Radar View:</span>
            <div className="flex bg-command-950 rounded p-0.5 border border-command-800 text-[10px]">
              <button
                onClick={() => setActiveView('overlay')}
                className={`px-2 py-0.5 rounded transition ${activeView === 'overlay' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
              >
                Segmentation
              </button>
              <button
                onClick={() => setActiveView('mask')}
                className={`px-2 py-0.5 rounded transition ${activeView === 'mask' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
              >
                Binary Mask
              </button>
            </div>
          </div>

          <div className="relative w-full h-44 bg-black rounded-lg overflow-hidden border border-command-700 flex items-center justify-center">
            <img
              src={activeView === 'overlay' ? spill.raw_preview_base64 : spill.mask_base64}
              alt="SAR Radar Detection"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-command-950/80 backdrop-blur-sm border border-command-700 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300">
              {spill.sensor}
            </div>
          </div>
        </div>
      )}

      {/* Extracted Spill Metrics Grid */}
      {spill && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-command-950/80 border border-command-800 rounded-lg p-2">
            <div className="text-[10px] text-slate-400 font-medium">Slick Surface Area</div>
            <div className="text-base font-bold font-mono text-cyan-300 mt-0.5">
              {spill.area_km2} <span className="text-[10px] text-slate-400 font-normal">km²</span>
            </div>
          </div>

          <div className="bg-command-950/80 border border-command-800 rounded-lg p-2">
            <div className="text-[10px] text-slate-400 font-medium">Slick Perimeter</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
              {spill.perimeter_km} <span className="text-[10px] text-slate-400 font-normal">km</span>
            </div>
          </div>

          <div className="bg-command-950/80 border border-command-800 rounded-lg p-2">
            <div className="text-[10px] text-slate-400 font-medium">Detection Confidence</div>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {spill.confidence}%
            </div>
          </div>

          <div className="bg-command-950/80 border border-command-800 rounded-lg p-2">
            <div className="text-[10px] text-slate-400 font-medium">Centroid Coordinates</div>
            <div className="text-[11px] font-mono text-slate-200 mt-1 truncate">
              {spill.centroid.lat.toFixed(4)}°, {spill.centroid.lon.toFixed(4)}°
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
