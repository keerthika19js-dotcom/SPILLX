import React from 'react';
import { 
  Satellite, Compass, ShieldAlert, FileText, 
  Activity, CheckCircle2, ChevronRight, Anchor, Waves, Wind 
} from 'lucide-react';

export default function MethodologyView() {
  return (
    <div className="w-full h-full overflow-y-auto bg-command-950 p-6 md:p-8 space-y-8 select-text">
      {/* Hero Header */}
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 text-xs font-mono font-bold tracking-widest">
          <span>SMART INDIA HACKATHON // SIH26143</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-mono">
          SPILLX: SYSTEM ARCHITECTURE & FORENSIC METHODOLOGY
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          An AI-powered maritime environmental intelligence platform engineered to detect satellite Synthetic Aperture Radar (SAR) oil spills, simulate backward oceanographic Lagrangian drift, correlate with NOAA MarineCadastre AIS vessel traffic data, and identify culprit polluters under MARPOL Annex I regulations.
        </p>
      </div>

      {/* 5-Step Pipeline Flow Cards */}
      <div className="max-w-5xl mx-auto space-y-4">
        <h2 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase">
          END-TO-END 5-STAGE FORENSIC WORKFLOW
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="bg-command-900/80 border border-command-700/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-cyan-400">01 // DETECT</span>
              <Satellite className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-xs font-bold text-white">SAR Spill Detection</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Exploits Marangoni damping on capillary waves to segment low-backscatter dark slick polygons.
            </p>
          </div>

          <div className="bg-command-900/80 border border-command-700/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-400">02 // INGEST</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-xs font-bold text-white">NOAA AIS Ingestion</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Dynamically parses AccessAIS CSV files, standardizes coordinates, and reconstructs ship trajectories.
            </p>
          </div>

          <div className="bg-command-900/80 border border-command-700/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-orange-400">03 // TRACE</span>
              <Compass className="w-4 h-4 text-orange-400" />
            </div>
            <h3 className="text-xs font-bold text-white">Backward Drift Sim</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Lagrangian reverse integration modeling 3.2% wind leeway, Coriolis deflection, and turbulent dispersion.
            </p>
          </div>

          <div className="bg-command-900/80 border border-command-700/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-red-400">04 // CORRELATE</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="text-xs font-bold text-white">Culprit Correlation</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Multi-factor scoring across proximity, release window, dark AIS blackouts, and loitering maneuvers.
            </p>
          </div>

          <div className="bg-command-900/80 border border-command-700/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-400">05 // REPORT</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-xs font-bold text-white">Tamper-Evident Dossier</h3>
            <p className="text-[11px] text-slate-400 leading-normal">
              Generates legal PDF evidence package secured with SHA-256 cryptographic verification checksum.
            </p>
          </div>
        </div>
      </div>

      {/* Physics & Mathematics Formulation Deep-Dive */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module A: SAR Physics */}
        <div className="bg-command-900/70 border border-command-700/80 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Satellite className="w-4 h-4" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
              1. Satellite SAR Oil Spill Detection Physics
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            In satellite Synthetic Aperture Radar (SAR) imagery, calm ocean backscatter is governed by Bragg scattering against centimeter-scale capillary-gravity surface waves. When petroleum hydrocarbons (crude oil, heavy fuel oil, bilge sludge) coat the water surface:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li><b>Marangoni Damping:</b> Oil films create surface tension gradients that strongly attenuate high-frequency capillary ripples.</li>
            <li><b>Low Radar Backscatter:</b> Without ripples, the radar pulse reflects specularly away from the satellite antenna, resulting in prominent dark patches.</li>
            <li><b>Image Processing Pipeline:</b> Bilateral edge-preserving filter → CLAHE contrast equalization → Statistical adaptive thresholding → Morphological closure → Georeferenced contour polygonization.</li>
          </ul>
        </div>

        {/* Module B: Lagrangian Drift Math */}
        <div className="bg-command-900/70 border border-command-700/80 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-orange-400">
            <Wind className="w-4 h-4" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
              2. Simplified Lagrangian Reverse Drift Model
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The net drift velocity vector V_drift of a surface oil slick is modeled as:
          </p>
          <div className="bg-command-950 p-3 rounded-lg font-mono text-xs text-orange-300 border border-command-800">
            V_drift = V_current + alpha * R(theta_c) * V_wind
          </div>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li><b>alpha = 0.032:</b> 3.2% surface wind leeway factor.</li>
            <li><b>theta_c = +12 deg:</b> Coriolis leeway deflection angle (clockwise in Northern Hemisphere).</li>
            <li><b>Reverse Time Step:</b> X(t - dt) = X(t) - V_drift * dt</li>
            <li><b>Turbulent Dispersion:</b> Uncertainty radius expands as R(tau) = R_0 + k_disp * sqrt(tau), generating the probable origin polygon.</li>
          </ul>
        </div>

        {/* Module C: Culprit Correlation Scoring Formula */}
        <div className="bg-command-900/70 border border-command-700/80 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-red-400">
            <ShieldAlert className="w-4 h-4" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
              3. Explainable Culprit Suspicion Scoring Engine
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every candidate vessel track within the spatial-temporal search envelope is evaluated using a normalized weighted multi-criteria function:
          </p>
          <div className="bg-command-950 p-3 rounded-lg font-mono text-xs text-red-300 border border-command-800">
            Suspicion Score = w_prox * S_prox + w_temp * S_temp + w_gap * S_gap + w_anom * S_anom
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="bg-command-950/60 p-2 rounded border border-command-800">
              <b className="text-cyan-400">Proximity (35%):</b> Closest Point of Approach (CPA) distance to the origin zone polygon.
            </div>
            <div className="bg-command-950/60 p-2 rounded border border-command-800">
              <b className="text-amber-400">Temporal (25%):</b> Alignment of passage with estimated oil discharge window.
            </div>
            <div className="bg-command-950/60 p-2 rounded border border-command-800">
              <b className="text-red-400">AIS Gap (20%):</b> Blackout interval (&gt;30 min) during transit near origin zone.
            </div>
            <div className="bg-command-950/60 p-2 rounded border border-command-800">
              <b className="text-purple-400">Anomaly (20%):</b> Sudden deceleration (bilge pump bypass) and tanker risk profile.
            </div>
          </div>
        </div>

        {/* Module D: AIS Spoofing & Dark Vessel Evasion */}
        <div className="bg-command-900/70 border border-command-700/80 rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-purple-400">
            <Anchor className="w-4 h-4" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider">
              4. AIS Position Spoofing & Dark Vessel Detection
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Key differentiator features designed to combat deliberate evasion tactics:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li><b>Dark Vessel Blackout:</b> Detects transponder silencing where consecutive position broadcasts exceed expected Class A transmission intervals while transiting near high-risk zones.</li>
            <li><b>Kinematic Teleportation Checks:</b> Verifies physical realizability v_implied = distance / dt. Any jump exceeding 35.0 knots without High-Speed Craft classification triggers a high-severity spoofing alert.</li>
            <li><b>Frozen GPS Detection:</b> Identifies static coordinate locks where a vessel reports underway engine status (SOG &gt; 5 kt) while coordinates remain frozen.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
