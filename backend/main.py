import os
import io
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from .models.schemas import (
    SpillDetectionResult, DriftRequest, DriftResult,
    CorrelationRequest, CorrelationResult, VesselTrack,
    ReportRequest, ScoringWeights
)
from .services.sar_detector import SARSpillDetector
from .services.drift_model import LagrangianDriftSimulator
from .services.ais_engine import AISEngine
from .services.correlation_engine import VesselCorrelationEngine
from .services.report_generator import ReportGenerator

app = FastAPI(
    title="SPILLX Maritime Forensics API",
    description="AI-powered maritime oil-spill detection and NOAA AIS vessel correlation engine (SIH26143)",
    version="1.0.0"
)

# Enable CORS for frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize singletons
sar_detector = SARSpillDetector()
drift_simulator = LagrangianDriftSimulator()
ais_engine = AISEngine()
correlation_engine = VesselCorrelationEngine()
report_generator = ReportGenerator()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLE_AIS_PATH = os.path.join(BASE_DIR, "sample_data", "ais_noaa_sample.csv")
SAMPLE_SAR_DIR = os.path.join(BASE_DIR, "sample_data", "sar_images")
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")

if os.path.exists(os.path.join(FRONTEND_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "SPILLX Maritime Forensics Platform",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "sih_problem": "SIH26143"
    }


@app.post("/api/detect-spill", response_model=SpillDetectionResult)
async def detect_oil_spill(
    file: Optional[UploadFile] = File(None),
    preset: Optional[str] = Query(None),
    min_lat: float = Query(27.85),
    min_lon: float = Query(-91.25),
    max_lat: float = Query(28.25),
    max_lon: float = Query(-90.65),
    sensitivity: float = Query(0.5, ge=0.1, le=1.0),
    sensor_name: str = Query("Sentinel-1 SAR (C-band VV)"),
    detection_time: str = Query("2026-09-10T04:15:00Z")
):
    bbox = [min_lat, min_lon, max_lat, max_lon]

    if file is not None:
        contents = await file.read()
    elif preset:
        preset_file = os.path.join(SAMPLE_SAR_DIR, f"{preset}_sentinel1.png")
        if not os.path.exists(preset_file):
            preset_file = os.path.join(SAMPLE_SAR_DIR, "gulf_of_mexico_sentinel1.png")
        with open(preset_file, "rb") as f:
            contents = f.read()
    else:
        default_file = os.path.join(SAMPLE_SAR_DIR, "gulf_of_mexico_sentinel1.png")
        with open(default_file, "rb") as f:
            contents = f.read()

    result = sar_detector.detect_spill(
        image_bytes=contents,
        bbox=bbox,
        detection_time=detection_time,
        sensor_name=sensor_name,
        threshold_sensitivity=sensitivity
    )
    return result


@app.post("/api/simulate-drift", response_model=DriftResult)
def simulate_drift(request: DriftRequest):
    return drift_simulator.simulate_backward_drift(request)


@app.post("/api/upload-ais", response_model=List[VesselTrack])
async def upload_ais_data(
    file: Optional[UploadFile] = File(None),
    spill_release_start: Optional[str] = Form(None),
    spill_release_end: Optional[str] = Form(None),
    origin_lat: Optional[float] = Form(None),
    origin_lon: Optional[float] = Form(None),
    simulate_dark_mmsi: Optional[int] = Form(None),
    gap_threshold_min: float = Form(30.0)
):
    if file is not None:
        csv_bytes = await file.read()
    else:
        with open(SAMPLE_AIS_PATH, "rb") as f:
            csv_bytes = f.read()

    custom_ais = AISEngine(default_gap_threshold_min=gap_threshold_min)
    tracks = custom_ais.parse_ais_csv(
        csv_content=csv_bytes,
        spill_release_start=spill_release_start,
        spill_release_end=spill_release_end,
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        simulate_dark_mmsi=simulate_dark_mmsi
    )
    return tracks


@app.post("/api/correlate", response_model=CorrelationResult)
def correlate_vessels(request: CorrelationRequest):
    tracks = request.vessel_tracks
    if not tracks:
        with open(SAMPLE_AIS_PATH, "rb") as f:
            csv_bytes = f.read()
        tracks = ais_engine.parse_ais_csv(
            csv_content=csv_bytes,
            spill_release_start=request.drift.estimated_release_start,
            spill_release_end=request.drift.estimated_release_end,
            origin_lat=request.drift.origin_centroid.lat,
            origin_lon=request.drift.origin_centroid.lon
        )

    return correlation_engine.correlate(
        tracks=tracks,
        origin_lat=request.drift.origin_centroid.lat,
        origin_lon=request.drift.origin_centroid.lon,
        origin_zone_polygon=request.drift.probable_origin_zone,
        release_start_iso=request.drift.estimated_release_start,
        release_end_iso=request.drift.estimated_release_end,
        release_midpoint_iso=request.drift.release_window_midpoint,
        weights=request.weights,
        search_radius_nm=request.search_radius_nm
    )


@app.get("/api/scenarios")
def get_scenarios():
    return [
        {
            "id": "gulf_of_mexico",
            "title": "Scenario 1: Gulf of Mexico Bilge Discharge",
            "subtitle": "Tanker 'OCEAN TITAN' illegal discharge with 75-min dark AIS blackout",
            "location": "Gulf of Mexico (Fairway)",
            "sensor": "Sentinel-1 SAR (C-band VV)",
            "detection_time": "2026-09-10T04:15:00Z",
            "bbox": [27.85, -91.25, 28.25, -90.65],
            "wind": {"speed_knots": 12.0, "direction_deg": 220.0},
            "current": {"speed_knots": 0.8, "direction_deg": 65.0},
            "drift_hours": 8.0,
            "highlight_culprit": "OCEAN TITAN (MMSI: 368123456)"
        },
        {
            "id": "singapore_strait",
            "title": "Scenario 2: Singapore Strait High-Density Transit",
            "subtitle": "Multiple congested targets with dark loitering tanker",
            "location": "Singapore Strait (Phillip Channel)",
            "sensor": "Sentinel-1 SAR (C-band VV)",
            "detection_time": "2026-09-10T06:30:00Z",
            "bbox": [1.15, 103.65, 1.45, 104.15],
            "wind": {"speed_knots": 9.5, "direction_deg": 190.0},
            "current": {"speed_knots": 1.4, "direction_deg": 80.0},
            "drift_hours": 6.5,
            "highlight_culprit": "OCEAN TITAN (MMSI: 368123456)"
        },
        {
            "id": "english_channel",
            "title": "Scenario 3: English Channel Kinematic Spoofing",
            "subtitle": "Vessel attempting identity concealment via impossible speed teleportation",
            "location": "Dover Strait / English Channel",
            "sensor": "Sentinel-1 SAR (C-band VV)",
            "detection_time": "2026-09-10T05:00:00Z",
            "bbox": [50.85, 1.15, 51.25, 1.75],
            "wind": {"speed_knots": 14.0, "direction_deg": 240.0},
            "current": {"speed_knots": 1.1, "direction_deg": 50.0},
            "drift_hours": 7.0,
            "highlight_culprit": "SEA PHANTOM (MMSI: 338987654)"
        }
    ]


@app.get("/api/scenarios/{scenario_id}")
def load_scenario(scenario_id: str):
    preset_file = os.path.join(SAMPLE_SAR_DIR, f"{scenario_id}_sentinel1.png")
    if not os.path.exists(preset_file):
        preset_file = os.path.join(SAMPLE_SAR_DIR, "gulf_of_mexico_sentinel1.png")
    
    with open(preset_file, "rb") as f:
        img_bytes = f.read()

    if scenario_id == "singapore_strait":
        bbox = [1.15, 103.65, 1.45, 104.15]
        det_time = "2026-09-10T06:30:00Z"
        wind_spd, wind_dir = 9.5, 190.0
        curr_spd, curr_dir = 1.4, 80.0
        drift_h = 6.5
    elif scenario_id == "english_channel":
        bbox = [50.85, 1.15, 51.25, 1.75]
        det_time = "2026-09-10T05:00:00Z"
        wind_spd, wind_dir = 14.0, 240.0
        curr_spd, curr_dir = 1.1, 50.0
        drift_h = 7.0
    else:
        bbox = [27.85, -91.25, 28.25, -90.65]
        det_time = "2026-09-10T04:15:00Z"
        wind_spd, wind_dir = 12.0, 220.0
        curr_spd, curr_dir = 0.8, 65.0
        drift_h = 8.0

    spill = sar_detector.detect_spill(
        image_bytes=img_bytes,
        bbox=bbox,
        detection_time=det_time,
        sensor_name="Sentinel-1 SAR (C-band VV)",
        threshold_sensitivity=0.55
    )

    drift_req = DriftRequest(
        spill_centroid=spill.centroid,
        spill_polygon=spill.polygon,
        spill_time=spill.timestamp,
        wind_speed_knots=wind_spd,
        wind_direction_deg=wind_dir,
        current_speed_knots=curr_spd,
        current_direction_deg=curr_dir,
        drift_hours=drift_h
    )
    drift = drift_simulator.simulate_backward_drift(drift_req)

    with open(SAMPLE_AIS_PATH, "rb") as f:
        csv_bytes = f.read()

    if scenario_id == "singapore_strait":
        import pandas as pd
        df = pd.read_csv(io.StringIO(csv_bytes.decode("utf-8")))
        dlat = 1.30 - 28.00
        dlon = 103.90 - (-91.00)
        df["LAT"] = df["LAT"] + dlat
        df["LON"] = df["LON"] + dlon
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        csv_bytes = buf.getvalue().encode("utf-8")
    elif scenario_id == "english_channel":
        import pandas as pd
        df = pd.read_csv(io.StringIO(csv_bytes.decode("utf-8")))
        dlat = 51.05 - 28.00
        dlon = 1.45 - (-91.00)
        df["LAT"] = df["LAT"] + dlat
        df["LON"] = df["LON"] + dlon
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        csv_bytes = buf.getvalue().encode("utf-8")

    tracks = ais_engine.parse_ais_csv(
        csv_content=csv_bytes,
        spill_release_start=drift.estimated_release_start,
        spill_release_end=drift.estimated_release_end,
        origin_lat=drift.origin_centroid.lat,
        origin_lon=drift.origin_centroid.lon
    )

    weights = ScoringWeights(proximity=0.35, temporal=0.25, gap=0.20, anomaly=0.20)
    correlation = correlation_engine.correlate(
        tracks=tracks,
        origin_lat=drift.origin_centroid.lat,
        origin_lon=drift.origin_centroid.lon,
        origin_zone_polygon=drift.probable_origin_zone,
        release_start_iso=drift.estimated_release_start,
        release_end_iso=drift.estimated_release_end,
        release_midpoint_iso=drift.release_window_midpoint,
        weights=weights,
        search_radius_nm=18.0
    )

    return {
        "scenario_id": scenario_id,
        "spill": spill,
        "drift": drift,
        "vessel_tracks": tracks,
        "correlation": correlation,
        "scoring_weights": weights
    }


@app.post("/api/generate-report")
def generate_pdf_report(request: ReportRequest):
    pdf_bytes = report_generator.generate_pdf_report(request.model_dump())
    incident_id = request.spill_data.get("spill_id", "INCIDENT")
    filename = f"SPILLX_Evidence_Report_{incident_id}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend build pending. Run npm run build in frontend/"}
