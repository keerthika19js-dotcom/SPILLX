import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, Eye, EyeOff, Navigation, AlertTriangle, 
  Clock, ShieldAlert, Crosshair, ZoomIn, ZoomOut 
} from 'lucide-react';

export default function TacticalMap({ 
  spill, 
  drift, 
  vessels, 
  selectedVessel, 
  onSelectVessel, 
  currentTime,
  simulationPlaying 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    spill: null,
    originZone: null,
    driftTrail: null,
    tracksGroup: null,
    gapsGroup: null,
    vesselMarkersGroup: null,
    spoofGroup: null,
  });

  const [visibleLayers, setVisibleLayers] = useState({
    spill: true,
    originZone: true,
    driftTrail: true,
    tracks: true,
    gaps: true,
    spoofs: true,
  });

  // Helper to determine track color by score
  const getScoreColor = (score) => {
    if (score >= 75) return '#ef4444'; // Red (High)
    if (score >= 45) return '#f59e0b'; // Amber (Medium)
    return '#10b981'; // Green (Low)
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Center in Gulf of Mexico default
    const map = L.map(mapContainerRef.current, {
      center: [28.0, -91.0],
      zoom: 9,
      zoomControl: false,
      attributionControl: false,
    });

    // OpenStreetMap is public and does not require a provider API key on Pages.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Initialize layer groups
    layersRef.current.tracksGroup = L.layerGroup().addTo(map);
    layersRef.current.gapsGroup = L.layerGroup().addTo(map);
    layersRef.current.vesselMarkersGroup = L.layerGroup().addTo(map);
    layersRef.current.spoofGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Spill & Drift Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Render Spill Polygon
    if (layersRef.current.spill) {
      map.removeLayer(layersRef.current.spill);
      layersRef.current.spill = null;
    }

    if (spill && spill.polygon && visibleLayers.spill) {
      const latlngs = spill.polygon.map(p => [p[0], p[1]]);
      const spillPoly = L.polygon(latlngs, {
        color: '#22d3ee', // Cyan border
        weight: 2,
        fillColor: '#0f172a', // dark oil slick
        fillOpacity: 0.75,
        dashArray: '2, 4',
      });

      spillPoly.bindPopup(`
        <div style="font-family: inherit; font-size: 11px;">
          <div style="font-weight: bold; color: #38bdf8; margin-bottom: 4px;">OIL SPILL FOOTPRINT</div>
          <div><b>ID:</b> ${spill.spill_id}</div>
          <div><b>Area:</b> ${spill.area_km2} km²</div>
          <div><b>Perimeter:</b> ${spill.perimeter_km} km</div>
          <div><b>Confidence:</b> ${spill.confidence}%</div>
          <div><b>Sensor:</b> ${spill.sensor}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 4px;">Detected: ${spill.timestamp}</div>
        </div>
      `);

      spillPoly.addTo(map);
      layersRef.current.spill = spillPoly;
    }

    // 2. Render Origin Zone & Drift Trajectory
    if (layersRef.current.originZone) {
      map.removeLayer(layersRef.current.originZone);
      layersRef.current.originZone = null;
    }
    if (layersRef.current.driftTrail) {
      map.removeLayer(layersRef.current.driftTrail);
      layersRef.current.driftTrail = null;
    }

    if (drift && visibleLayers.originZone) {
      // Origin zone polygon
      const originLatLngs = drift.probable_origin_zone.map(p => [p[0], p[1]]);
      const originPoly = L.polygon(originLatLngs, {
        color: '#f97316', // Orange
        weight: 2.5,
        fillColor: '#ea580c',
        fillOpacity: 0.22,
        dashArray: '6, 6',
        className: 'pulsating-origin',
      });

      originPoly.bindPopup(`
        <div style="font-family: inherit; font-size: 11px;">
          <div style="font-weight: bold; color: #fb923c; margin-bottom: 4px;">PROBABLE SPILL ORIGIN ZONE</div>
          <div><b>Estimated Release Window:</b></div>
          <div style="color: #fdba74; font-size: 10px;">${drift.estimated_release_start.substring(11, 16)} to ${drift.estimated_release_end.substring(11, 16)} UTC</div>
          <div><b>Drift Back:</b> ${drift.drift_hours} Hours</div>
          <div><b>Net Drift:</b> ${drift.net_drift_vector_knots} kt @ ${drift.net_drift_bearing_deg}°</div>
          <div><b>Dispersion Radius:</b> ±${drift.dispersion_radius_km} km</div>
        </div>
      `);

      originPoly.addTo(map);
      layersRef.current.originZone = originPoly;

    }

    // Backward drift trajectory trail is independently toggleable.
    if (drift && visibleLayers.driftTrail && drift.trajectory) {
      const trailPts = drift.trajectory.map(t => [t.lat, t.lon]);
      const trail = L.polyline(trailPts, {
        color: '#fbbf24',
        weight: 2,
        opacity: 0.7,
        dashArray: '4, 4',
      });
      trail.addTo(map);
      layersRef.current.driftTrail = trail;
    }

    // Auto-fit map bounds to encompass spill and origin zone
    if (spill && drift) {
      const bounds = L.latLngBounds([
        [spill.centroid.lat, spill.centroid.lon],
        [drift.origin_centroid.lat, drift.origin_centroid.lon],
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 11 });
    }
  }, [spill, drift, visibleLayers.spill, visibleLayers.originZone, visibleLayers.driftTrail]);

  // Update Vessel Tracks, Gaps, and Spoofing Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !vessels) return;

    layersRef.current.tracksGroup.clearLayers();
    layersRef.current.gapsGroup.clearLayers();
    layersRef.current.spoofGroup.clearLayers();

    if (!visibleLayers.tracks) return;

    vessels.forEach(v => {
      const isSelected = selectedVessel && selectedVessel.mmsi === v.mmsi;
      const scoreColor = getScoreColor(v.suspicion_score);

      // 1. Vessel Track Polyline
      if (v.track_points && v.track_points.length > 1) {
        const pts = v.track_points.map(p => [p.lat, p.lon]);

        // Background glow if selected
        if (isSelected) {
          const halo = L.polyline(pts, {
            color: '#38bdf8',
            weight: 8,
            opacity: 0.45,
          });
          layersRef.current.tracksGroup.addLayer(halo);
        }

        const trackLine = L.polyline(pts, {
          color: scoreColor,
          weight: isSelected ? 3.5 : 2,
          opacity: isSelected ? 1.0 : 0.75,
        });

        trackLine.on('click', () => onSelectVessel(v));
        trackLine.bindTooltip(`<b>${v.vessel_name}</b><br/>Score: ${v.suspicion_score}%`, {
          sticky: true,
          className: 'bg-command-900 text-xs border border-command-700',
        });

        layersRef.current.tracksGroup.addLayer(trackLine);
      }

      // 2. Blackout Gaps (Dashed Red Lines)
      if (visibleLayers.gaps && v.has_suspicious_gap && v.track_points) {
        // Find gap segment
        // In our data, gap occurs between two points with interval > 30 min
        for (let i = 0; i < v.track_points.length - 1; i++) {
          const t1 = new Date(v.track_points[i].timestamp).getTime();
          const t2 = new Date(v.track_points[i + 1].timestamp).getTime();
          const dtMin = (t2 - t1) / 60000;

          if (dtMin >= 30) {
            const gapPts = [
              [v.track_points[i].lat, v.track_points[i].lon],
              [v.track_points[i + 1].lat, v.track_points[i + 1].lon]
            ];

            const gapLine = L.polyline(gapPts, {
              color: '#ef4444',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.9,
            });

            gapLine.bindPopup(`
              <div style="font-size: 11px;">
                <div style="color: #ef4444; font-weight: bold;">SUSPICIOUS AIS BLACKOUT GAP</div>
                <div><b>Vessel:</b> ${v.vessel_name}</div>
                <div><b>Duration:</b> ${Math.round(dtMin)} Minutes</div>
                <div style="color: #fda4af; font-size: 10px; margin-top: 4px;">AIS transponder was silenced during transit across spill release window.</div>
              </div>
            `);

            layersRef.current.gapsGroup.addLayer(gapLine);
          }
        }
      }

      // 3. Spoofing Alerts
      if (visibleLayers.spoofs && v.has_spoofing_alert) {
        const p = v.track_points && v.track_points[14] ? v.track_points[14] : v.track_points[0];
        if (p) {
          const spoofIcon = L.divIcon({
            className: 'custom-spoof-icon',
            html: `
              <div style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; background: #dc2626; border: 2px solid #fecaca; border-radius: 4px; box-shadow: 0 0 10px rgba(220, 38, 38, 0.8);">
                <span style="color: white; font-size: 12px; font-weight: bold;">!</span>
              </div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          const marker = L.marker([p.lat, p.lon], { icon: spoofIcon });
          marker.bindPopup(`
            <div style="font-size: 11px;">
              <div style="color: #dc2626; font-weight: bold;">KINEMATIC POSITION SPOOFING ALERT</div>
              <div><b>Vessel:</b> ${v.vessel_name} (${v.mmsi})</div>
              <div><b>Description:</b> ${v.spoofing_description || 'Impossible speed jump detected'}</div>
            </div>
          `);
          layersRef.current.spoofGroup.addLayer(marker);
        }
      }
    });
  }, [vessels, selectedVessel, visibleLayers.tracks, visibleLayers.gaps, visibleLayers.spoofs]);

  // Update Vessel Marker Positions based on Timeline Slider currentTime
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !vessels || !currentTime) return;

    layersRef.current.vesselMarkersGroup.clearLayers();

    const targetTimeMs = new Date(currentTime).getTime();

    vessels.forEach(v => {
      if (!v.track_points || v.track_points.length === 0) return;

      // Find closest point or interpolate between p1 and p2
      let curPoint = v.track_points[0];
      for (let i = 0; i < v.track_points.length; i++) {
        const pTimeMs = new Date(v.track_points[i].timestamp).getTime();
        if (pTimeMs <= targetTimeMs) {
          curPoint = v.track_points[i];
        } else {
          break;
        }
      }

      const isTopCulprit = v.rank === 1;
      const isSelected = selectedVessel && selectedVessel.mmsi === v.mmsi;
      const color = getScoreColor(v.suspicion_score);
      const heading = curPoint.heading || curPoint.cog || 0;

      // Custom SVG Ship Icon with heading orientation
      const shipIcon = L.divIcon({
        className: 'ship-marker-icon',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            ${isTopCulprit ? '<div class="pulsating-marker" style="position: absolute; width: 28px; height: 28px;"></div>' : ''}
            <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="${color}" stroke="#0f172a" stroke-width="1.5">
                <polygon points="12,2 19,21 12,17 5,21" />
              </svg>
            </div>
            ${isSelected ? '<div style="position: absolute; width: 26px; height: 26px; border: 2px solid #38bdf8; border-radius: 50%;"></div>' : ''}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([curPoint.lat, curPoint.lon], { icon: shipIcon });
      marker.on('click', () => onSelectVessel(v));
      marker.bindTooltip(`
        <div style="font-size: 11px; font-family: inherit;">
          <b>${v.vessel_name}</b> (${v.vessel_type})<br/>
          Speed: ${curPoint.sog ? curPoint.sog + ' kt' : 'N/A'} | Suspicion: ${v.suspicion_score}%
        </div>
      `, { sticky: true, className: 'bg-command-900 border border-command-700 text-xs' });

      layersRef.current.vesselMarkersGroup.addLayer(marker);
    });
  }, [currentTime, vessels, selectedVessel]);

  // Center on Selected Vessel
  const handleCenterSelected = () => {
    if (!selectedVessel || !selectedVessel.track_points || !mapInstanceRef.current) return;
    const p = selectedVessel.track_points[Math.floor(selectedVessel.track_points.length / 2)];
    mapInstanceRef.current.setView([p.lat, p.lon], 11, { animate: true });
  };

  // Fit Entire Incident View
  const handleFitIncident = () => {
    if (!mapInstanceRef.current || !spill || !drift) return;
    const bounds = L.latLngBounds([
      [spill.centroid.lat, spill.centroid.lon],
      [drift.origin_centroid.lat, drift.origin_centroid.lon],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
  };

  return (
    <div className="relative w-full h-full bg-command-950 overflow-hidden select-none">
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls & Quick Actions */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        {/* Layer Toggle Floating Drawer */}
        <div className="bg-command-900/90 backdrop-blur-md border border-command-700/80 rounded-lg p-2 shadow-xl flex flex-col space-y-1.5 text-xs text-slate-300 w-44">
          <div className="flex items-center justify-between pb-1 border-b border-command-800 font-semibold text-cyan-400 font-mono text-[11px]">
            <span className="flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5" />
              <span>MAP LAYERS</span>
            </span>
          </div>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400"></span>
              <span>Drift Trail</span>
            </span>
            <input
              type="checkbox"
              checked={visibleLayers.driftTrail}
              onChange={e => setVisibleLayers(v => ({ ...v, driftTrail: e.target.checked }))}
              className="accent-amber-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
              <span>Spill Footprint</span>
            </span>
            <input 
              type="checkbox" 
              checked={visibleLayers.spill} 
              onChange={e => setVisibleLayers(v => ({ ...v, spill: e.target.checked }))}
              className="accent-cyan-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
              <span>Origin Zone</span>
            </span>
            <input 
              type="checkbox" 
              checked={visibleLayers.originZone} 
              onChange={e => setVisibleLayers(v => ({ ...v, originZone: e.target.checked }))}
              className="accent-orange-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
              <span>Vessel Tracks</span>
            </span>
            <input 
              type="checkbox" 
              checked={visibleLayers.tracks} 
              onChange={e => setVisibleLayers(v => ({ ...v, tracks: e.target.checked }))}
              className="accent-emerald-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
              <span>Dark Gaps</span>
            </span>
            <input 
              type="checkbox" 
              checked={visibleLayers.gaps} 
              onChange={e => setVisibleLayers(v => ({ ...v, gaps: e.target.checked }))}
              className="accent-red-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:text-white">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600"></span>
              <span>Spoof Alerts</span>
            </span>
            <input 
              type="checkbox" 
              checked={visibleLayers.spoofs} 
              onChange={e => setVisibleLayers(v => ({ ...v, spoofs: e.target.checked }))}
              className="accent-rose-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Tactical Navigation Shortcuts */}
        <div className="bg-command-900/90 backdrop-blur-md border border-command-700/80 rounded-lg p-1.5 shadow-xl flex flex-col space-y-1">
          <button 
            onClick={handleFitIncident}
            title="Fit Spill & Origin Incident"
            className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-command-800 rounded transition"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          {selectedVessel && (
            <button 
              onClick={handleCenterSelected}
              title={`Center on ${selectedVessel.vessel_name}`}
              className="p-1.5 text-cyan-400 hover:text-white hover:bg-command-800 rounded transition"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Legend Badge at Bottom-Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-command-950/85 backdrop-blur-md border border-command-700/80 rounded-lg p-2.5 text-[11px] shadow-2xl flex items-center space-x-4">
        <span className="text-slate-400 font-mono font-semibold">SUSPICION:</span>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-slate-200">High (&gt;75%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-200">Medium (45-75%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-200">Low (&lt;45%)</span>
        </div>
        <div className="h-3 w-px bg-command-700"></div>
        <div className="flex items-center space-x-1">
          <span className="w-4 h-0.5 bg-red-500 border-b border-dashed border-red-300"></span>
          <span className="text-slate-300">Dark Gap</span>
        </div>
      </div>
    </div>
  );
}
