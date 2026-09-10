import React, { useRef, useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TacticalMap from './components/TacticalMap';
import TimelinePlayer from './components/TimelinePlayer';
import SpillControlPanel from './components/SpillControlPanel';
import DriftControlPanel from './components/DriftControlPanel';
import SuspectLeaderboard from './components/SuspectLeaderboard';
import ReportModal from './components/ReportModal';
import MethodologyView from './components/MethodologyView';
import JudgeBriefModal from './components/JudgeBriefModal';
import MissionOverview from './components/MissionOverview';
import EvidenceCenter from './components/EvidenceCenter';
import { demoScenarios, demoScenarioData, demoScenarioDataById } from './demoData';
import { Layers, Sliders, ChevronLeft, ChevronRight } from 'lucide-react';

export default function App() {
  const [scenarios, setScenarios] = useState([]);
  const [currentScenario, setCurrentScenario] = useState('gulf_of_mexico');
  const [activeTab, setActiveTab] = useState('investigation'); // 'investigation' | 'methodology'
  const [activePage, setActivePage] = useState('investigation');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Core Data
  const [spill, setSpill] = useState(null);
  const [drift, setDrift] = useState(null);
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [scoringWeights, setScoringWeights] = useState({
    proximity: 0.35,
    temporal: 0.25,
    gap: 0.20,
    anomaly: 0.20,
  });

  // Timeline State
  const [startTime, setStartTime] = useState('2026-09-09T19:00:00Z');
  const [endTime, setEndTime] = useState('2026-09-10T04:15:00Z');
  const [currentTime, setCurrentTime] = useState('2026-09-09T20:30:00Z');
  const [isPlaying, setIsPlaying] = useState(false);

  // Left Sidebar Tabs
  const [leftTab, setLeftTab] = useState('sar'); // 'sar' | 'drift'
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  // Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isJudgeBriefOpen, setIsJudgeBriefOpen] = useState(false);

  // Dark Vessel Simulation Toggle
  const [isSimulatingDark, setIsSimulatingDark] = useState(false);
  const workspaceTouchStart = useRef(null);
  const panelTouchStart = useRef(null);

  const changeScenarioBy = (step) => {
    if (!scenarios.length) return;
    const currentIndex = scenarios.findIndex(scenario => scenario.id === currentScenario);
    const nextIndex = (currentIndex + step + scenarios.length) % scenarios.length;
    handleSelectScenario(scenarios[nextIndex].id);
  };

  const handleWorkspaceTouchStart = (event) => {
    workspaceTouchStart.current = event.touches[0].clientX;
  };

  const handleWorkspaceTouchEnd = (event) => {
    if (workspaceTouchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - workspaceTouchStart.current;
    workspaceTouchStart.current = null;
    if (Math.abs(distance) < 60 || event.target.closest('button, input, select, textarea')) return;
    changeScenarioBy(distance < 0 ? 1 : -1);
  };

  const handlePanelTouchStart = (event) => {
    panelTouchStart.current = event.touches[0].clientX;
  };

  const handlePanelTouchEnd = (event) => {
    if (panelTouchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - panelTouchStart.current;
    panelTouchStart.current = null;
    if (Math.abs(distance) < 60 || event.target.closest('button, input, select, textarea')) return;
    setLeftTab(distance < 0 ? 'drift' : 'sar');
  };

  // 1. Initial Load: Fetch Scenarios and Load Default
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const resScenarios = await fetch('/api/scenarios');
        if (!resScenarios.ok) throw new Error('API unavailable');
        const scenariosData = await resScenarios.json();
        setScenarios(scenariosData);

        // Load Scenario 1
        await loadScenarioData('gulf_of_mexico');
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setIsDemoMode(true);
        setScenarios(demoScenarios);
        applyScenarioData(demoScenarioDataById.gulf_of_mexico);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const applyScenarioData = (data) => {
    setSpill(data.spill);
    setDrift(data.drift);
    setVessels(data.correlation.suspects);
    setSelectedVessel(data.correlation.suspects[0] || null);
    setScoringWeights(data.scoring_weights);
    setStartTime(data.drift.estimated_release_start);
    setEndTime(data.spill.timestamp);
    setCurrentTime(data.drift.release_window_midpoint);
  };

  // 2. Load Full Scenario Package
  const loadScenarioData = async (scenarioId) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await fetch(`/api/scenarios/${scenarioId}`);
      if (!res.ok) throw new Error('Scenario fetch failed');
      const data = await res.json();

      applyScenarioData(data);
    } catch (err) {
      console.error('Error loading scenario:', err);
      setIsDemoMode(true);
      applyScenarioData(demoScenarioDataById[scenarioId] || demoScenarioData);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScenario = (scenarioId) => {
    setCurrentScenario(scenarioId);
    loadScenarioData(scenarioId);
  };

  const handlePageChange = (page) => {
    setActivePage(page);
    if (page === 'methodology') setActiveTab('methodology');
    if (page !== 'methodology') setActiveTab('investigation');
  };

  // 3. SAR Re-detection Handler
  const handleDetectSpill = async ({ file, preset, sensitivity }) => {
    if (isDemoMode) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch(`/api/detect-spill?sensitivity=${sensitivity}`, {
          method: 'POST',
          body: formData,
        });
      } else {
        const p = preset || currentScenario;
        res = await fetch(`/api/detect-spill?preset=${p}&sensitivity=${sensitivity}`, {
          method: 'POST',
        });
      }

      if (!res.ok) throw new Error('Spill detection failed');
      const newSpill = await res.json();
      setSpill(newSpill);

      // Re-run drift with new centroid
      if (drift) {
        await handleRunDrift({
          wind_speed_knots: 12.0,
          wind_direction_deg: 220.0,
          current_speed_knots: 0.8,
          current_direction_deg: 65.0,
          drift_hours: drift.drift_hours || 8.0,
          spill_override: newSpill,
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Spill detection or drift reconstruction failed.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Drift Simulation Handler
  const handleRunDrift = async (driftParams) => {
    const activeSpill = driftParams.spill_override || spill;
    if (!activeSpill) return;

    try {
      setLoading(true);
      setErrorMessage('');
      const payload = {
        spill_centroid: activeSpill.centroid,
        spill_polygon: activeSpill.polygon,
        spill_time: activeSpill.timestamp,
        wind_speed_knots: driftParams.wind_speed_knots,
        wind_direction_deg: driftParams.wind_direction_deg,
        current_speed_knots: driftParams.current_speed_knots,
        current_direction_deg: driftParams.current_direction_deg,
        drift_hours: driftParams.drift_hours,
      };

      const res = await fetch('/api/simulate-drift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Drift simulation failed');
      const newDrift = await res.json();
      setDrift(newDrift);

      // Re-correlate with new drift origin
      await handleReCorrelate(activeSpill, newDrift, scoringWeights);
    } catch (err) {
      console.error(err);
      setErrorMessage('Backward drift simulation or vessel correlation failed.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Re-run Correlation & Weights Update
  const handleReCorrelate = async (activeSpill, activeDrift, weights) => {
    try {
      setErrorMessage('');
      const payload = {
        spill: activeSpill || spill,
        drift: activeDrift || drift,
        weights: weights || scoringWeights,
        search_radius_nm: 18.0,
      };

      const res = await fetch('/api/correlate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Correlation failed');
      const data = await res.json();
      setVessels(data.suspects);
      if (data.suspects.length > 0) {
        setSelectedVessel(data.suspects[0]);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Vessel correlation failed.');
    }
  };

  const handleUpdateWeights = (newWeights) => {
    setScoringWeights(newWeights);
    handleReCorrelate(spill, drift, newWeights);
  };

  const handleExportEvidence = () => {
    const evidence = {
      exported_at: new Date().toISOString(),
      platform: 'SPILLX Maritime Forensics Platform',
      scenario: currentScenario,
      spill,
      drift,
      suspects: vessels,
      scoring_weights: scoringWeights,
    };
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SPILLX_Evidence_${currentScenario}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 6. Simulate Dark Vessel Toggle
  const handleSimulateDarkVessel = async () => {
    const nextSim = !isSimulatingDark;
    setIsSimulatingDark(nextSim);

    // Call upload-ais with simulate_dark_mmsi = 368123456 (Ocean Titan)
    try {
      setLoading(true);
      setErrorMessage('');
      const formData = new FormData();
      if (drift) {
        formData.append('spill_release_start', drift.estimated_release_start);
        formData.append('spill_release_end', drift.estimated_release_end);
        formData.append('origin_lat', drift.origin_centroid.lat.toString());
        formData.append('origin_lon', drift.origin_centroid.lon.toString());
      }
      if (nextSim) {
        formData.append('simulate_dark_mmsi', '368123456');
      }

      const resAis = await fetch('/api/upload-ais', {
        method: 'POST',
        body: formData,
      });

      const tracks = await resAis.json();

      // Re-correlate
      const resCorr = await fetch('/api/correlate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spill,
          drift,
          vessel_tracks: tracks,
          weights: scoringWeights,
        }),
      });

      const corrData = await resCorr.json();
      setVessels(corrData.suspects);
      setSelectedVessel(corrData.suspects[0] || null);
    } catch (err) {
      console.error(err);
      setErrorMessage('AIS simulation or correlation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-command-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <Navbar
        scenarios={scenarios}
        currentScenario={currentScenario}
        onSelectScenario={handleSelectScenario}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePage={activePage}
        onPageChange={handlePageChange}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenBrief={() => setIsJudgeBriefOpen(true)}
        loading={loading}
        onScenarioStep={changeScenarioBy}
        scenarioPosition={scenarios.length ? `${scenarios.findIndex(scenario => scenario.id === currentScenario) + 1} / ${scenarios.length}` : ''}
      />

      {errorMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-lg border border-red-700 bg-red-950/95 px-4 py-2 text-xs text-red-100 shadow-xl">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="font-bold text-red-300 hover:text-white" aria-label="Dismiss error">X</button>
        </div>
      )}

      {isDemoMode && !errorMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 rounded-lg border border-amber-700 bg-amber-950/95 px-4 py-2 text-xs text-amber-100 shadow-xl">
          GitHub Pages demo mode: live API actions require the localhost backend.
        </div>
      )}

      {/* Main Investigation Workspace */}
      <div
        className="flex-1 flex overflow-hidden relative"
        onTouchStart={handleWorkspaceTouchStart}
        onTouchEnd={handleWorkspaceTouchEnd}
      >
        {activePage === 'overview' ? (
          <MissionOverview
            scenarios={scenarios}
            currentScenario={currentScenario}
            onSelectScenario={handleSelectScenario}
            spill={spill}
            drift={drift}
            suspects={vessels}
            onOpenBrief={() => setIsJudgeBriefOpen(true)}
            onOpenInvestigation={() => handlePageChange('investigation')}
          />
        ) : activePage === 'evidence' ? (
          <EvidenceCenter
            spill={spill}
            drift={drift}
            suspects={vessels}
            onExportEvidence={handleExportEvidence}
            onSelectVessel={(vessel) => { setSelectedVessel(vessel); handlePageChange('investigation'); }}
          />
        ) : activePage === 'methodology' ? (
          <MethodologyView />
        ) : (
          <>
            {/* Left Control Panel: SAR & Drift Tabs */}
            <div
              onTouchStart={handlePanelTouchStart}
              onTouchEnd={handlePanelTouchEnd}
              className={`relative flex flex-col transition-all duration-300 z-10 shrink-0 border-r border-command-700/60 bg-command-950 ${
              isLeftCollapsed ? 'w-0 overflow-hidden border-none' : 'w-80 md:w-96'
            }`}
            >
              {/* Tab Switcher */}
              <div className="flex border-b border-command-800 bg-command-900/60 shrink-0">
                <button
                  onClick={() => setLeftTab('sar')}
                  className={`flex-1 py-2.5 text-xs font-mono font-bold tracking-wider transition ${
                    leftTab === 'sar'
                      ? 'border-b-2 border-cyan-400 text-cyan-400 bg-command-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SAR DETECTION
                </button>
                <button
                  onClick={() => setLeftTab('drift')}
                  className={`flex-1 py-2.5 text-xs font-mono font-bold tracking-wider transition ${
                    leftTab === 'drift'
                      ? 'border-b-2 border-orange-400 text-orange-400 bg-command-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  DRIFT ORIGIN
                </button>
              </div>

              {/* Scrollable Panel Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {leftTab === 'sar' ? (
                  <SpillControlPanel
                    spill={spill}
                    onDetectSpill={handleDetectSpill}
                    loading={loading}
                    currentPreset={currentScenario}
                    onSelectPreset={handleSelectScenario}
                  />
                ) : (
                  <DriftControlPanel
                    drift={drift}
                    onRunDrift={handleRunDrift}
                    loading={loading}
                  />
                )}
              </div>
            </div>

            {/* Collapse / Expand Left Panel Toggle */}
            <button
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-command-900 hover:bg-command-800 border border-command-700 text-slate-300 p-1 rounded-r-md shadow-lg transition"
              style={{ left: isLeftCollapsed ? 0 : undefined }}
              title={isLeftCollapsed ? 'Expand Control Panel' : 'Collapse Control Panel'}
            >
              {isLeftCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>

            {/* Center Tactical Map View */}
            <div className="flex-1 h-full relative overflow-hidden">
              <TacticalMap
                spill={spill}
                drift={drift}
                vessels={vessels}
                selectedVessel={selectedVessel}
                onSelectVessel={setSelectedVessel}
                currentTime={currentTime}
                simulationPlaying={isPlaying}
              />
            </div>

            {/* Right Panel: Suspect Leaderboard & Evidence */}
            <div className="w-80 md:w-96 border-l border-command-700/60 bg-command-950 shrink-0 z-10 flex flex-col overflow-hidden">
              <SuspectLeaderboard
                suspects={vessels}
                selectedVessel={selectedVessel}
                onSelectVessel={setSelectedVessel}
                weights={scoringWeights}
                onUpdateWeights={handleUpdateWeights}
                onSimulateDarkVessel={handleSimulateDarkVessel}
                isSimulatingDark={isSimulatingDark}
              />
            </div>
          </>
        )}
      </div>

      {/* Bottom Chronological Timeline Scrubber (visible on investigation tab) */}
      {activePage === 'investigation' && (
        <TimelinePlayer
          startTime={startTime}
          endTime={endTime}
          currentTime={currentTime}
          onTimeChange={setCurrentTime}
          releaseStart={drift ? drift.estimated_release_start : null}
          releaseEnd={drift ? drift.estimated_release_end : null}
          detectionTime={spill ? spill.timestamp : null}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
      )}

      {/* Evidence Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        spill={spill}
        drift={drift}
        suspects={vessels}
        weights={scoringWeights}
      />

      <JudgeBriefModal
        isOpen={isJudgeBriefOpen}
        onClose={() => setIsJudgeBriefOpen(false)}
        scenario={scenarios.find(scenario => scenario.id === currentScenario)}
        spill={spill}
        drift={drift}
        suspects={vessels}
        onExportEvidence={handleExportEvidence}
      />
    </div>
  );
}
