import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, FastForward, Clock, 
  Calendar, AlertCircle, Radio 
} from 'lucide-react';

export default function TimelinePlayer({
  startTime,
  endTime,
  currentTime,
  onTimeChange,
  releaseStart,
  releaseEnd,
  detectionTime,
  isPlaying,
  setIsPlaying,
}) {
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x

  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const currentMs = new Date(currentTime).getTime();
  const totalDurationMs = Math.max(1, endMs - startMs);

  // Playback timer loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        onTimeChange(prev => {
          const prevMs = new Date(prev).getTime();
          // Step forward based on speed (e.g. 6 minutes of real simulation per tick)
          const nextMs = prevMs + 60000 * 6 * speed;
          if (nextMs >= endMs) {
            setIsPlaying(false);
            return new Date(endMs).toISOString();
          }
          return new Date(nextMs).toISOString();
        });
      }, 350);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, endMs, onTimeChange, setIsPlaying]);

  // Calculate percentage of release window on slider
  const relStartMs = releaseStart ? new Date(releaseStart).getTime() : 0;
  const relEndMs = releaseEnd ? new Date(releaseEnd).getTime() : 0;
  const detMs = detectionTime ? new Date(detectionTime).getTime() : 0;

  const relStartPct = Math.max(0, Math.min(100, ((relStartMs - startMs) / totalDurationMs) * 100));
  const relEndPct = Math.max(0, Math.min(100, ((relEndMs - startMs) / totalDurationMs) * 100));
  const detPct = Math.max(0, Math.min(100, ((detMs - startMs) / totalDurationMs) * 100));
  const currentPct = Math.max(0, Math.min(100, ((currentMs - startMs) / totalDurationMs) * 100));

  const handleSliderChange = (e) => {
    const valPct = parseFloat(e.target.value);
    const newMs = startMs + (valPct / 100) * totalDurationMs;
    onTimeChange(new Date(newMs).toISOString());
  };

  const handleReset = () => {
    setIsPlaying(false);
    onTimeChange(new Date(startMs).toISOString());
  };

  const handleJumpToRelease = () => {
    setIsPlaying(false);
    onTimeChange(new Date(relStartMs).toISOString());
  };

  const handleJumpToDetection = () => {
    setIsPlaying(false);
    onTimeChange(new Date(endMs).toISOString());
  };

  const formatUtcTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toUTCString().replace('GMT', 'UTC');
    } catch {
      return iso;
    }
  };

  return (
    <div className="h-16 bg-command-900 border-t border-command-700/70 px-6 flex items-center justify-between z-20 shrink-0 select-none shadow-2xl">
      {/* Play / Pause / Speed Controls */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition active:scale-95"
          title={isPlaying ? "Pause Timeline" : "Play Timeline"}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
        </button>

        <button
          onClick={handleReset}
          className="p-2 text-slate-400 hover:text-white hover:bg-command-800 rounded-lg transition"
          title="Reset to Start"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed Toggles */}
        <div className="flex items-center bg-command-950 border border-command-800 rounded-lg p-0.5 text-xs font-mono">
          {[1, 2, 5].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded transition ${speed === s ? 'bg-cyan-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Scrub Track with Visual Phase Highlights */}
      <div className="flex-1 max-w-2xl mx-8 flex flex-col justify-center">
        <div className="relative w-full flex items-center">
          {/* Release window highlight band */}
          {relStartPct < relEndPct && (
            <div
              style={{ left: `${relStartPct}%`, width: `${relEndPct - relStartPct}%` }}
              className="absolute h-3 bg-orange-500/30 border-l border-r border-orange-400 rounded-sm pointer-events-none z-0"
              title="Estimated Spill Release Window"
            />
          )}

          {/* Satellite pass detection point marker */}
          {detPct > 0 && (
            <div
              style={{ left: `${detPct}%` }}
              className="absolute w-1 h-4 bg-cyan-400 shadow-sm shadow-cyan-400 pointer-events-none z-0 -translate-x-1/2"
              title="Sentinel-1 SAR Detection Time"
            />
          )}

          {/* HTML5 Range Slider */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={currentPct}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-command-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 z-10"
          />
        </div>

        {/* Legend beneath slider */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
          <span>{formatUtcTime(startTime).substring(17, 22)} UTC</span>
          <div className="flex items-center space-x-3">
            <button onClick={handleJumpToRelease} className="hover:text-orange-400 transition flex items-center space-x-1">
              <span className="w-2 h-2 rounded-sm bg-orange-500 inline-block"></span>
              <span>Est. Release Window</span>
            </button>
            <button onClick={handleJumpToDetection} className="hover:text-cyan-400 transition flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
              <span>SAR Detection</span>
            </button>
          </div>
          <span>{formatUtcTime(endTime).substring(17, 22)} UTC</span>
        </div>
      </div>

      {/* Current Scrubbed Time Display */}
      <div className="flex items-center space-x-2 bg-command-950/80 border border-command-800 rounded-lg px-3 py-1.5 font-mono">
        <Clock className="w-4 h-4 text-cyan-400" />
        <div className="text-right">
          <div className="text-xs font-bold text-slate-100">
            {formatUtcTime(currentTime).substring(17, 25)} UTC
          </div>
          <div className="text-[9px] text-slate-400">
            {formatUtcTime(currentTime).substring(0, 16)}
          </div>
        </div>
      </div>
    </div>
  );
}
