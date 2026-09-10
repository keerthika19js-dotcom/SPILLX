from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class GeoPoint(BaseModel):
    lat: float
    lon: float

class SpillDetectionResult(BaseModel):
    spill_id: str
    timestamp: str
    centroid: GeoPoint
    polygon: List[List[float]] = Field(description='Array of [lat, lon] coordinates')
    area_km2: float
    perimeter_km: float
    confidence: float
    sensor: str = 'Sentinel-1 SAR (C-band VV)'
    mask_base64: Optional[str] = None
    raw_preview_base64: Optional[str] = None
    bounding_box: Optional[List[float]] = None  # [min_lat, min_lon, max_lat, max_lon]
    slick_contrast_ratio: Optional[float] = None
    slick_major_axis_km: Optional[float] = None

class DriftRequest(BaseModel):
    spill_centroid: GeoPoint
    spill_polygon: Optional[List[List[float]]] = None
    spill_time: str
    wind_speed_knots: float = 12.0
    wind_direction_deg: float = 220.0  # Direction wind is coming FROM
    current_speed_knots: float = 0.8
    current_direction_deg: float = 65.0 # Direction current is flowing TOWARDS
    drift_hours: float = 8.0
    leeway_factor: float = 0.032

class DriftTrajectoryPoint(BaseModel):
    step_hours_ago: float
    timestamp: str
    lat: float
    lon: float
    dispersion_radius_km: float

class DriftResult(BaseModel):
    trajectory: List[DriftTrajectoryPoint]
    probable_origin_zone: List[List[float]]
    origin_centroid: GeoPoint
    estimated_release_start: str
    estimated_release_end: str
    release_window_midpoint: str
    net_drift_vector_knots: float
    net_drift_bearing_deg: float
    drift_hours: float
    dispersion_radius_km: float

class AISGap(BaseModel):
    start_time: str
    end_time: str
    duration_min: float
    start_point: List[float]  # [lat, lon]
    end_point: List[float]    # [lat, lon]
    is_suspicious: bool
    reason: Optional[str] = None

class SpoofingAlert(BaseModel):
    type: str  # 'KINEMATIC_JUMP', 'CONCURRENT_POSITION', 'GPS_STUCK'
    timestamp: str
    description: str
    severity: str  # 'HIGH', 'MEDIUM'
    implied_speed_knots: Optional[float] = None
    coordinates: Optional[List[float]] = None

class AISPoint(BaseModel):
    lat: float
    lon: float
    timestamp: str
    sog: Optional[float] = None
    cog: Optional[float] = None
    heading: Optional[float] = None

class VesselTrack(BaseModel):
    mmsi: int
    vessel_name: str
    vessel_type: str
    imo: Optional[str] = None
    call_sign: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    draft: Optional[float] = None
    points: List[AISPoint]
    total_distance_nm: float
    avg_speed_knots: float
    gaps: List[AISGap] = []
    spoofing_alerts: List[SpoofingAlert] = []

class ScoringWeights(BaseModel):
    proximity: float = 0.35
    temporal: float = 0.25
    gap: float = 0.20
    anomaly: float = 0.20

class ScoreBreakdown(BaseModel):
    proximity_score: float
    temporal_score: float
    gap_score: float
    anomaly_score: float
    proximity_contribution: float
    temporal_contribution: float
    gap_contribution: float
    anomaly_contribution: float

class SuspectVessel(BaseModel):
    mmsi: int
    vessel_name: str
    vessel_type: str
    imo: Optional[str] = None
    suspicion_score: float
    rank: int
    min_distance_to_origin_km: float
    closest_approach_time: str
    time_diff_hours: float
    score_breakdown: ScoreBreakdown
    has_suspicious_gap: bool
    gap_duration_minutes: float
    has_spoofing_alert: bool
    spoofing_description: Optional[str] = None
    behavior_notes: List[str] = []
    track_points: List[AISPoint] = []
    length: Optional[float] = None
    draft: Optional[float] = None

class CorrelationRequest(BaseModel):
    spill: SpillDetectionResult
    drift: DriftResult
    vessel_tracks: Optional[List[VesselTrack]] = None
    weights: ScoringWeights = ScoringWeights()
    search_radius_nm: float = 12.0

class CorrelationResult(BaseModel):
    incident_id: str
    total_vessels_scanned: int
    candidates_evaluated: int
    suspects: List[SuspectVessel]
    top_suspect_mmsi: Optional[int] = None
    origin_zone: List[List[float]]
    release_window: Dict[str, str]

class ReportRequest(BaseModel):
    incident_title: str
    investigator_name: str = 'Maritime Environmental Enforcement Division'
    agency: str = 'Indian Coast Guard / DG Shipping'
    notes: Optional[str] = ''
    spill_data: Dict[str, Any]
    drift_data: Dict[str, Any]
    suspects: List[Dict[str, Any]]
    scoring_weights: Dict[str, float]
