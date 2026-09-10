const demoSarImage = (name) => `${import.meta.env.BASE_URL}${name}_sentinel1.png`;

const gulfSpill = {
  spill_id: 'SPILL-SAR-DEMO',
  timestamp: '2026-09-10T04:15:00Z',
  centroid: { lat: 28.0057, lon: -90.9021 },
  polygon: [[28.08, -91.08], [28.14, -90.92], [28.04, -90.74], [27.91, -90.79], [27.87, -91.00], [28.08, -91.08]],
  area_km2: 400.85,
  perimeter_km: 288.78,
  confidence: 74.1,
  sensor: 'Sentinel-1 SAR (C-band VV)',
  raw_preview_base64: demoSarImage('gulf_of_mexico'),
  mask_base64: demoSarImage('gulf_of_mexico'),
};

const gulfDrift = {
  origin_centroid: { lat: 27.9291, lon: -91.0572 },
  probable_origin_zone: [[28.00, -91.16], [28.05, -91.00], [27.93, -90.92], [27.82, -91.02], [27.80, -91.16], [28.00, -91.16]],
  estimated_release_start: '2026-09-09T18:15:00Z',
  estimated_release_end: '2026-09-09T22:15:00Z',
  release_window_midpoint: '2026-09-09T20:15:00Z',
  net_drift_vector_knots: 1.18,
  net_drift_bearing_deg: 60.8,
  drift_hours: 8,
  dispersion_radius_km: 7.2,
  trajectory: [
    { lat: 27.9291, lon: -91.0572, timestamp: '2026-09-09T20:15:00Z' },
    { lat: 27.95, lon: -91.02, timestamp: '2026-09-09T21:15:00Z' },
    { lat: 27.98, lon: -90.97, timestamp: '2026-09-09T22:15:00Z' },
    { lat: 28.0057, lon: -90.9021, timestamp: '2026-09-10T04:15:00Z' },
  ],
};

const points = (coords) => coords.map(([lat, lon, timestamp, sog = 12, cog = 60]) => ({ lat, lon, timestamp, sog, cog, heading: cog }));
const vessel = (mmsi, name, type, score, rank, coords, notes, gap = false, spoof = false) => ({
  mmsi, vessel_name: name, vessel_type: type, suspicion_score: score, rank,
  min_distance_to_origin_km: rank === 1 ? 0 : rank === 2 ? 5.8 : 13.4,
  closest_approach_time: '2026-09-09T20:20:00Z', time_diff_hours: 0.1,
  has_suspicious_gap: gap, gap_duration_minutes: gap ? 75 : 0,
  has_spoofing_alert: spoof, spoofing_description: spoof ? 'Impossible speed jump detected' : null,
  behavior_notes: notes, track_points: points(coords), length: 180, draft: 9.2,
  score_breakdown: { proximity_score: score, temporal_score: 95, gap_score: gap ? 97 : 20, anomaly_score: spoof ? 85 : 55, proximity_contribution: 35, temporal_contribution: 23.75, gap_contribution: gap ? 19.4 : 4, anomaly_contribution: 17 },
});

const demoVessels = [
  vessel(368123456, 'OCEAN TITAN', 'Crude/Chemical Tanker', 95.4, 1, [[27.72, -91.20, '2026-09-09T17:30:00Z', 13], [27.86, -91.12, '2026-09-09T18:45:00Z', 4], [28.02, -90.96, '2026-09-09T20:20:00Z', 4], [28.13, -90.82, '2026-09-09T22:00:00Z', 13]], ['DARK TRANSIT: Vessel crossed the origin zone during a 75 min AIS blackout', 'Sudden speed reduction near spill origin'], true),
  vessel(338987654, 'SEA PHANTOM', 'Cargo Vessel', 68.2, 2, [[27.70, -91.28, '2026-09-09T17:30:00Z', 16], [27.90, -91.10, '2026-09-09T19:30:00Z', 16], [28.08, -90.87, '2026-09-09T20:30:00Z', 46]], ['POSITION SPOOFING DETECTED: Impossible speed jump'], false, true),
  vessel(477456789, 'GULF TRADER', 'Container Ship', 42.6, 3, [[27.60, -91.35, '2026-09-09T17:30:00Z', 11], [27.83, -91.18, '2026-09-09T19:30:00Z', 11], [28.18, -90.80, '2026-09-09T22:30:00Z', 11]], ['Proximity: Closest approach was 13.4 km from origin']),
];

export const demoScenarios = [
  { id: 'gulf_of_mexico', title: 'Scenario 1: Gulf of Mexico Bilge Discharge' },
  { id: 'singapore_strait', title: 'Scenario 2: Singapore Strait High-Density Transit' },
  { id: 'english_channel', title: 'Scenario 3: English Channel Kinematic Spoofing' },
];

export const demoScenarioData = {
  scenario_id: 'gulf_of_mexico',
  spill: gulfSpill,
  drift: gulfDrift,
  correlation: { suspects: demoVessels },
  scoring_weights: { proximity: 0.35, temporal: 0.25, gap: 0.20, anomaly: 0.20 },
};

const shiftPoint = (point, latOffset, lonOffset) => ({
  ...point,
  lat: point.lat + latOffset,
  lon: point.lon + lonOffset,
});

const shiftPolygon = (polygon, latOffset, lonOffset) => polygon.map(([lat, lon]) => [lat + latOffset, lon + lonOffset]);

const createScenarioData = ({
  id,
  imageName,
  centroid,
  origin,
  timestamp,
  releaseStart,
  releaseEnd,
  midpoint,
  area,
  confidence,
  vector,
  bearing,
  duration,
  scores,
  names,
}) => {
  const latOffset = centroid.lat - gulfSpill.centroid.lat;
  const lonOffset = centroid.lon - gulfSpill.centroid.lon;
  const spill = {
    ...gulfSpill,
    spill_id: `SPILL-SAR-${id.toUpperCase()}`,
    timestamp,
    centroid,
    polygon: shiftPolygon(gulfSpill.polygon, latOffset, lonOffset),
    area_km2: area,
    confidence,
    raw_preview_base64: demoSarImage(imageName),
    mask_base64: demoSarImage(imageName),
  };
  const drift = {
    ...gulfDrift,
    origin_centroid: origin,
    probable_origin_zone: shiftPolygon(gulfDrift.probable_origin_zone, latOffset, lonOffset),
    estimated_release_start: releaseStart,
    estimated_release_end: releaseEnd,
    release_window_midpoint: midpoint,
    net_drift_vector_knots: vector,
    net_drift_bearing_deg: bearing,
    drift_hours: duration,
    trajectory: gulfDrift.trajectory.map(point => shiftPoint(point, latOffset, lonOffset)),
  };
  const suspects = demoVessels.map((candidate, index) => ({
    ...candidate,
    vessel_name: names[index],
    suspicion_score: scores[index],
    rank: index + 1,
    track_points: candidate.track_points.map(point => shiftPoint(point, latOffset, lonOffset)),
    closest_approach_time: midpoint,
  }));
  return {
    scenario_id: id,
    spill,
    drift,
    correlation: { suspects },
    scoring_weights: { proximity: 0.35, temporal: 0.25, gap: 0.20, anomaly: 0.20 },
  };
};

export const demoScenarioDataById = {
  gulf_of_mexico: demoScenarioData,
  singapore_strait: createScenarioData({
    id: 'singapore_strait', imageName: 'singapore_strait', centroid: { lat: 1.30, lon: 103.90 }, origin: { lat: 1.22, lon: 103.78 },
    timestamp: '2026-09-10T06:30:00Z', releaseStart: '2026-09-10T00:00:00Z', releaseEnd: '2026-09-10T03:15:00Z', midpoint: '2026-09-10T01:37:00Z',
    area: 268.4, confidence: 81.6, vector: 1.42, bearing: 74.5, duration: 6.5, scores: [91.8, 64.7, 51.3], names: ['OCEAN TITAN', 'STRAIT VOYAGER', 'PACIFIC TRADER'],
  }),
  english_channel: createScenarioData({
    id: 'english_channel', imageName: 'english_channel', centroid: { lat: 51.05, lon: 1.45 }, origin: { lat: 50.96, lon: 1.30 },
    timestamp: '2026-09-10T05:00:00Z', releaseStart: '2026-09-09T21:00:00Z', releaseEnd: '2026-09-10T02:00:00Z', midpoint: '2026-09-09T23:30:00Z',
    area: 312.7, confidence: 78.9, vector: 1.67, bearing: 52.2, duration: 7, scores: [88.6, 72.4, 48.9], names: ['SEA PHANTOM', 'DOVER CARRIER', 'CHANNEL STAR'],
  }),
};
