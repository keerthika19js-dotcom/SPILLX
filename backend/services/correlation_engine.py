import math
from datetime import datetime
import pandas as pd
from typing import List, Dict, Tuple, Any, Optional
from shapely.geometry import Point, Polygon, LineString
from ..models.schemas import (
    CorrelationResult, SuspectVessel,
    ScoreBreakdown, ScoringWeights, VesselTrack, AISPoint
)
from .ais_engine import haversine_distance_km, haversine_distance_nm

def point_to_segment_distance_km(p_lat: float, p_lon: float, lat1: float, lon1: float, lat2: float, lon2: float) -> Tuple[float, float, float]:
    """
    Computes minimum haversine distance from a point to a line segment,
    and returns (min_distance_km, proj_lat, proj_lon).
    """
    dx = lon2 - lon1
    dy = lat2 - lat1
    seg_len_sq = dx*dx + dy*dy

    if seg_len_sq < 1e-10:
        return haversine_distance_km(p_lat, p_lon, lat1, lon1), lat1, lon1

    # Project point onto segment parameter t in [0, 1]
    t = max(0.0, min(1.0, ((p_lon - lon1) * dx + (p_lat - lat1) * dy) / seg_len_sq))
    proj_lat = lat1 + t * dy
    proj_lon = lon1 + t * dx
    d_km = haversine_distance_km(p_lat, p_lon, proj_lat, proj_lon)
    return d_km, proj_lat, proj_lon

class VesselCorrelationEngine:
    """
    Multi-criteria AIS vessel correlation engine with explainable scoring.
    Correlates reconstructed vessel trajectories with backward drift origin zones.
    Evaluates both broadcast position points and interpolated blackout (dark vessel) gaps.
    """

    def __init__(self):
        pass

    def correlate(
        self,
        tracks: List[VesselTrack],
        origin_lat: float,
        origin_lon: float,
        origin_zone_polygon: List[List[float]],
        release_start_iso: str,
        release_end_iso: str,
        release_midpoint_iso: str,
        weights: ScoringWeights = ScoringWeights(),
        search_radius_nm: float = 18.0
    ) -> CorrelationResult:
        """
        Evaluate and rank all vessel tracks against the spill origin zone and time window.
        """
        t_start = pd.to_datetime(release_start_iso, utc=True)
        t_end = pd.to_datetime(release_end_iso, utc=True)
        t_mid = pd.to_datetime(release_midpoint_iso, utc=True)
        window_half_width_hours = max(1.0, (t_end - t_start).total_seconds() / 7200.0)

        # Normalize weights
        w_sum = weights.proximity + weights.temporal + weights.gap + weights.anomaly
        if w_sum <= 0:
            w_sum = 1.0
        w_p = weights.proximity / w_sum
        w_t = weights.temporal / w_sum
        w_g = weights.gap / w_sum
        w_a = weights.anomaly / w_sum

        # Shapely polygon
        try:
            origin_poly_pts = [(p[1], p[0]) for p in origin_zone_polygon]
            origin_poly = Polygon(origin_poly_pts)
        except Exception:
            origin_poly = None

        evaluated_suspects: List[SuspectVessel] = []

        for track in tracks:
            if not track.points:
                continue

            min_dist_km = 999999.0
            closest_time = None
            point_inside_origin = False
            dark_transit_detected = False

            speeds_near_origin: List[float] = []
            speeds_all: List[float] = []

            # 1. Check discrete broadcast points
            for pt in track.points:
                p_time = pd.to_datetime(pt.timestamp, utc=True)
                d_km = haversine_distance_km(pt.lat, pt.lon, origin_lat, origin_lon)

                if pt.sog is not None and pt.sog >= 0:
                    speeds_all.append(pt.sog)

                if d_km < min_dist_km:
                    min_dist_km = d_km
                    closest_time = p_time

                if origin_poly is not None:
                    try:
                        if origin_poly.contains(Point(pt.lon, pt.lat)):
                            point_inside_origin = True
                            min_dist_km = 0.0
                    except Exception:
                        pass

                if d_km <= (search_radius_nm * 1.852 * 1.5) and pt.sog is not None:
                    speeds_near_origin.append(pt.sog)

            # 2. Check transmission gap segments (Dark Vessel Trajectory)
            for gap in track.gaps:
                g_start_lat, g_start_lon = gap.start_point
                g_end_lat, g_end_lon = gap.end_point
                d_seg_km, proj_lat, proj_lon = point_to_segment_distance_km(
                    origin_lat, origin_lon, g_start_lat, g_start_lon, g_end_lat, g_end_lon
                )

                # Check if gap line segment intersects origin polygon
                intersects_poly = False
                if origin_poly is not None:
                    try:
                        gap_line = LineString([(g_start_lon, g_start_lat), (g_end_lon, g_end_lat)])
                        intersects_poly = origin_poly.intersects(gap_line)
                    except Exception:
                        pass

                if intersects_poly or d_seg_km < 1.0:
                    dark_transit_detected = True
                    point_inside_origin = True
                    min_dist_km = 0.0
                    # Estimated CPA occurs during gap midpoint
                    g_t_start = pd.to_datetime(gap.start_time, utc=True)
                    g_t_end = pd.to_datetime(gap.end_time, utc=True)
                    closest_time = g_t_start + (g_t_end - g_t_start) / 2.0
                elif d_seg_km < min_dist_km:
                    min_dist_km = d_seg_km

            min_dist_nm = min_dist_km / 1.852
            if min_dist_nm > (search_radius_nm * 2.5):
                continue

            # Time delta between CPA and release midpoint
            if closest_time is not None:
                dt_hours = abs((closest_time - t_mid).total_seconds() / 3600.0)
                closest_time_str = closest_time.isoformat()
            else:
                dt_hours = 24.0
                closest_time_str = release_midpoint_iso

            # 1. Proximity Score (0 - 100)
            if point_inside_origin or min_dist_km <= 0.8:
                prox_score = 100.0
            else:
                prox_score = max(0.0, 100.0 * math.exp(-min_dist_km / 6.0))

            # 2. Temporal Score (0 - 100)
            if closest_time and (t_start <= closest_time <= t_end):
                temp_fraction = 1.0 - (dt_hours / window_half_width_hours)
                temp_score = max(80.0, min(100.0, 85.0 + 15.0 * temp_fraction))
            else:
                temp_score = max(0.0, 100.0 * math.exp(-(dt_hours**2) / (2.0 * (window_half_width_hours * 1.5)**2)))

            # 3. AIS Gap Score (0 - 100)
            gap_score = 0.0
            has_suspicious_gap = False
            suspicious_gap_duration = 0.0
            behavior_notes: List[str] = []

            for gap in track.gaps:
                if gap.is_suspicious:
                    has_suspicious_gap = True
                    suspicious_gap_duration = max(suspicious_gap_duration, gap.duration_min)
                    gap_score = min(100.0, 60.0 + gap.duration_min * 0.5)
                    behavior_notes.append(f"Suspicious AIS blackout of {gap.duration_min:.0f} min during spill release window")

            if not has_suspicious_gap and track.gaps:
                gap_score = min(25.0, max(0.0, track.gaps[0].duration_min * 0.15))

            # 4. Behavioral Anomaly Score (0 - 100)
            anom_score = 10.0
            avg_all_speed = float(pd.Series(speeds_all).mean()) if speeds_all else 12.0
            min_near_speed = float(pd.Series(speeds_near_origin).min()) if speeds_near_origin else avg_all_speed

            if speeds_near_origin and avg_all_speed > 8.0 and (min_near_speed <= avg_all_speed * 0.5):
                anom_score += 45.0
                behavior_notes.append(f"Sudden speed reduction: Cruising at {avg_all_speed:.1f} kt, decelerated to {min_near_speed:.1f} kt near spill origin")
            elif speeds_near_origin and min_near_speed < 5.0 and avg_all_speed > 7.0:
                anom_score += 30.0
                behavior_notes.append(f"Loitering / Slow steaming: {min_near_speed:.1f} kt near origin zone")

            vtype_lower = track.vessel_type.lower()
            if "tanker" in vtype_lower:
                anom_score += 30.0
                behavior_notes.append("High-risk vessel class: Crude/Chemical Tanker subject to MARPOL Annex I Special Area regulations")
            elif "cargo" in vtype_lower or "container" in vtype_lower:
                anom_score += 10.0

            has_spoof = False
            spoof_desc = None
            if track.spoofing_alerts:
                has_spoof = True
                spoof_desc = track.spoofing_alerts[0].description
                anom_score += 35.0
                behavior_notes.append(f"POSITION SPOOFING DETECTED: {spoof_desc}")

            anom_score = min(100.0, anom_score)

            if dark_transit_detected:
                behavior_notes.insert(0, f"DARK TRANSIT: Vessel traversed directly through origin zone while AIS transponder was silenced ({suspicious_gap_duration:.0f} min blackout)")
            elif point_inside_origin or min_dist_km <= 1.0:
                behavior_notes.insert(0, f"DIRECT TRANSIT: Vessel track passed directly through estimated spill origin zone (CPA {min_dist_km:.1f} km)")
            else:
                behavior_notes.insert(0, f"Proximity: Closest approach was {min_dist_km:.1f} km ({min_dist_nm:.1f} NM) from origin centroid")

            prox_contrib = round(w_p * prox_score, 2)
            temp_contrib = round(w_t * temp_score, 2)
            gap_contrib = round(w_g * gap_score, 2)
            anom_contrib = round(w_a * anom_score, 2)

            total_suspicion = round(prox_contrib + temp_contrib + gap_contrib + anom_contrib, 1)
            total_suspicion = min(99.5, max(5.0, total_suspicion))

            breakdown = ScoreBreakdown(
                proximity_score=round(prox_score, 1),
                temporal_score=round(temp_score, 1),
                gap_score=round(gap_score, 1),
                anomaly_score=round(anom_score, 1),
                proximity_contribution=prox_contrib,
                temporal_contribution=temp_contrib,
                gap_contribution=gap_contrib,
                anomaly_contribution=anom_contrib
            )

            evaluated_suspects.append(SuspectVessel(
                mmsi=track.mmsi,
                vessel_name=track.vessel_name,
                vessel_type=track.vessel_type,
                imo=track.imo,
                suspicion_score=total_suspicion,
                rank=0,
                min_distance_to_origin_km=round(min_dist_km, 2),
                closest_approach_time=closest_time_str,
                time_diff_hours=round(dt_hours, 2),
                score_breakdown=breakdown,
                has_suspicious_gap=has_suspicious_gap,
                gap_duration_minutes=round(suspicious_gap_duration, 1),
                has_spoofing_alert=has_spoof,
                spoofing_description=spoof_desc,
                behavior_notes=behavior_notes,
                track_points=track.points,
                length=track.length,
                draft=track.draft
            ))

        evaluated_suspects.sort(key=lambda s: s.suspicion_score, reverse=True)
        for idx, suspect in enumerate(evaluated_suspects):
            suspect.rank = idx + 1

        top_mmsi = evaluated_suspects[0].mmsi if evaluated_suspects else None

        return CorrelationResult(
            incident_id=f"INC-{abs(hash(release_midpoint_iso)) % 100000:05d}",
            total_vessels_scanned=len(tracks),
            candidates_evaluated=len(evaluated_suspects),
            suspects=evaluated_suspects,
            top_suspect_mmsi=top_mmsi,
            origin_zone=origin_zone_polygon,
            release_window={
                "start": release_start_iso,
                "end": release_end_iso,
                "midpoint": release_midpoint_iso
            }
        )
