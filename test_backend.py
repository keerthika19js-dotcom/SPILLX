import sys
import os

from backend.services.sar_detector import SARSpillDetector
from backend.services.drift_model import LagrangianDriftSimulator
from backend.services.ais_engine import AISEngine
from backend.services.correlation_engine import VesselCorrelationEngine
from backend.services.report_generator import ReportGenerator
from backend.models.schemas import DriftRequest, GeoPoint, ScoringWeights

print("=== STARTING SPILLX BACKEND VERIFICATION ===")

# 1. Test SAR Detector
print("[1/5] Testing SAR Detection Pipeline...")
detector = SARSpillDetector()
with open("sample_data/sar_images/gulf_of_mexico_sentinel1.png", "rb") as f:
    img_bytes = f.read()

spill = detector.detect_spill(img_bytes)
print(f"  -> Spill ID: {spill.spill_id}")
print(f"  -> Centroid: {spill.centroid.lat:.4f}, {spill.centroid.lon:.4f}")
print(f"  -> Area: {spill.area_km2} km², Perimeter: {spill.perimeter_km} km")
print(f"  -> Confidence: {spill.confidence}%, Polygon vertices: {len(spill.polygon)}")
assert spill.area_km2 > 0
assert len(spill.polygon) > 4
assert spill.confidence > 50

# 2. Test Drift Simulator
print("[2/5] Testing Lagrangian Reverse Drift Simulation...")
drift_sim = LagrangianDriftSimulator()
drift_req = DriftRequest(
    spill_centroid=spill.centroid,
    spill_polygon=spill.polygon,
    spill_time=spill.timestamp,
    wind_speed_knots=12.0,
    wind_direction_deg=220.0,
    current_speed_knots=0.8,
    current_direction_deg=65.0,
    drift_hours=8.0
)
drift = drift_sim.simulate_backward_drift(drift_req)
print(f"  -> Origin Centroid: {drift.origin_centroid.lat:.4f}, {drift.origin_centroid.lon:.4f}")
print(f"  -> Release Window: {drift.estimated_release_start} to {drift.estimated_release_end}")
print(f"  -> Drift Vector: {drift.net_drift_vector_knots} kt @ {drift.net_drift_bearing_deg}°")
print(f"  -> Trajectory points: {len(drift.trajectory)}, Origin zone points: {len(drift.probable_origin_zone)}")
assert len(drift.trajectory) > 5
assert len(drift.probable_origin_zone) > 10

# 3. Test AIS Engine
print("[3/5] Testing NOAA AIS Parsing, Gap Detection & Spoofing Detector...")
ais_engine = AISEngine(default_gap_threshold_min=30.0)
with open("sample_data/ais_noaa_sample.csv", "rb") as f:
    csv_bytes = f.read()

tracks = ais_engine.parse_ais_csv(
    csv_content=csv_bytes,
    spill_release_start=drift.estimated_release_start,
    spill_release_end=drift.estimated_release_end,
    origin_lat=drift.origin_centroid.lat,
    origin_lon=drift.origin_centroid.lon
)
print(f"  -> Reconstructed tracks for {len(tracks)} vessels.")

dark_vessels = [t for t in tracks if any(g.is_suspicious for g in t.gaps)]
print(f"  -> Suspicious Dark Vessels detected: {[t.vessel_name for t in dark_vessels]}")

spoofing_vessels = [t for t in tracks if t.spoofing_alerts]
print(f"  -> Spoofing Vessels flagged: {[t.vessel_name for t in spoofing_vessels]}")

assert len(dark_vessels) >= 1, "Expected at least 1 dark vessel gap flagged"
assert len(spoofing_vessels) >= 1, "Expected at least 1 kinematic spoofing alert"

# 4. Test Correlation Engine
print("[4/5] Testing Multi-Factor Correlation & Suspicion Scoring...")
corr_engine = VesselCorrelationEngine()
weights = ScoringWeights(proximity=0.35, temporal=0.25, gap=0.20, anomaly=0.20)
correlation = corr_engine.correlate(
    tracks=tracks,
    origin_lat=drift.origin_centroid.lat,
    origin_lon=drift.origin_centroid.lon,
    origin_zone_polygon=drift.probable_origin_zone,
    release_start_iso=drift.estimated_release_start,
    release_end_iso=drift.estimated_release_end,
    release_midpoint_iso=drift.release_window_midpoint,
    weights=weights
)

print(f"  -> Total suspects ranked: {len(correlation.suspects)}")
top_suspect = correlation.suspects[0]
print(f"  -> TOP SUSPECT (#1): {top_suspect.vessel_name} (MMSI: {top_suspect.mmsi})")
print(f"     Suspicion Score: {top_suspect.suspicion_score}%")
print(f"     Min Distance: {top_suspect.min_distance_to_origin_km} km")
print(f"     Breakdown: Prox={top_suspect.score_breakdown.proximity_score}, Temp={top_suspect.score_breakdown.temporal_score}, Gap={top_suspect.score_breakdown.gap_score}, Anom={top_suspect.score_breakdown.anomaly_score}")
print(f"     Behavior Notes: {top_suspect.behavior_notes}")

assert top_suspect.vessel_name == "OCEAN TITAN", f"Expected OCEAN TITAN to be top suspect, got {top_suspect.vessel_name}"
assert top_suspect.suspicion_score >= 80.0, f"Expected high suspicion score > 80%, got {top_suspect.suspicion_score}"

# 5. Test PDF Report Generation
print("[5/5] Testing Tamper-Evident Forensic PDF Report Generation...")
reporter = ReportGenerator()
report_data = {
    "incident_title": "Gulf of Mexico Bilge Discharge Incident",
    "investigator_name": "Cmdr. Rajesh Sharma, Maritime Enforcement",
    "agency": "Indian Coast Guard / DG Shipping",
    "spill_data": spill.model_dump(),
    "drift_data": drift.model_dump(),
    "suspects": [s.model_dump() for s in correlation.suspects],
    "scoring_weights": weights.model_dump()
}
pdf_bytes = reporter.generate_pdf_report(report_data)
print(f"  -> Generated PDF size: {len(pdf_bytes)} bytes")
assert len(pdf_bytes) > 2000, "PDF document appears too small"

with open("test_sample_report.pdf", "wb") as f:
    f.write(pdf_bytes)
print("  -> Saved test report to test_sample_report.pdf")

print("\n>>> ALL BACKEND MODULES PASSED VERIFICATION WITH 100% SUCCESS! <<<")
