import io
import math
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Tuple, Any, Optional
from ..models.schemas import VesselTrack, AISPoint, AISGap, SpoofingAlert

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance between two points on Earth in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in Nautical Miles (1 NM = 1.852 km)."""
    return haversine_distance_km(lat1, lon1, lat2, lon2) / 1.852

class AISEngine:
    """
    High-performance AIS ingestion, cleaning, track reconstruction,
    dark vessel blackout detection, and kinematic spoofing detector.
    """

    def __init__(self, default_gap_threshold_min: float = 30.0, max_speed_knots: float = 35.0):
        self.gap_threshold_min = default_gap_threshold_min
        self.max_speed_knots = max_speed_knots

    def parse_ais_csv(
        self,
        csv_content: str | bytes,
        spill_release_start: Optional[str] = None,
        spill_release_end: Optional[str] = None,
        origin_lat: Optional[float] = None,
        origin_lon: Optional[float] = None,
        simulate_dark_mmsi: Optional[int] = None
    ) -> List[VesselTrack]:
        """
        Dynamically parses NOAA MarineCadastre AccessAIS or standard AIS CSV data.
        Maps columns flexibly, cleans anomalies, reconstructs tracks, and flags anomalies.
        """
        if isinstance(csv_content, bytes):
            # Try utf-8, fallback to latin-1
            try:
                csv_str = csv_content.decode("utf-8")
            except UnicodeDecodeError:
                csv_str = csv_content.decode("latin-1")
            file_buffer = io.StringIO(csv_str)
        else:
            file_buffer = io.StringIO(csv_content)

        # Read CSV with pandas
        df = pd.read_csv(file_buffer)
        if df.empty:
            return []

        # Standardize column headers to lowercase and trimmed
        col_map = {}
        for col in df.columns:
            c_clean = str(col).strip().lower()
            if c_clean in ["mmsi"]:
                col_map[col] = "mmsi"
            elif c_clean in ["basedatetime", "datetime", "timestamp", "time", "date_time"]:
                col_map[col] = "timestamp"
            elif c_clean in ["lat", "latitude"]:
                col_map[col] = "lat"
            elif c_clean in ["lon", "long", "longitude"]:
                col_map[col] = "lon"
            elif c_clean in ["sog", "speed", "speed_knots"]:
                col_map[col] = "sog"
            elif c_clean in ["cog", "course"]:
                col_map[col] = "cog"
            elif c_clean in ["heading"]:
                col_map[col] = "heading"
            elif c_clean in ["vesselname", "shipname", "name"]:
                col_map[col] = "vessel_name"
            elif c_clean in ["imo"]:
                col_map[col] = "imo"
            elif c_clean in ["callsign", "call_sign"]:
                col_map[col] = "call_sign"
            elif c_clean in ["vesseltype", "shiptype", "type"]:
                col_map[col] = "vessel_type"
            elif c_clean in ["status", "navstatus"]:
                col_map[col] = "status"
            elif c_clean in ["length"]:
                col_map[col] = "length"
            elif c_clean in ["width"]:
                col_map[col] = "width"
            elif c_clean in ["draft"]:
                col_map[col] = "draft"
            elif c_clean in ["cargo"]:
                col_map[col] = "cargo"

        df = df.rename(columns=col_map)

        # Ensure minimal required columns exist
        required = ["mmsi", "timestamp", "lat", "lon"]
        for req in required:
            if req not in df.columns:
                raise ValueError(f"Missing essential AIS column: {req}. Found: {list(df.columns)}")

        # 1. Clean Coordinates & Types
        df["mmsi"] = pd.to_numeric(df["mmsi"], errors="coerce")
        df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
        df["lon"] = pd.to_numeric(df["lon"], errors="coerce")
        
        # Filter invalid rows
        df = df.dropna(subset=["mmsi", "lat", "lon", "timestamp"])
        df = df[(df["lat"] >= -90.0) & (df["lat"] <= 90.0) & (df["lon"] >= -180.0) & (df["lon"] <= 180.0)]
        df["mmsi"] = df["mmsi"].astype(int)

        # 2. Standardize Timestamps
        df["parsed_time"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        df = df.dropna(subset=["parsed_time"])

        # Optional simulated dark vessel: remove points for target vessel during simulation
        if simulate_dark_mmsi is not None and spill_release_start and spill_release_end:
            try:
                t_s = pd.to_datetime(spill_release_start, utc=True)
                t_e = pd.to_datetime(spill_release_end, utc=True)
                # Drop points falling right inside the release window for this vessel
                mask_cut = (df["mmsi"] == simulate_dark_mmsi) & (df["parsed_time"] >= t_s) & (df["parsed_time"] <= t_e)
                df = df[~mask_cut]
            except Exception:
                pass

        # Sort chronologically
        df = df.sort_values(by=["mmsi", "parsed_time"]).reset_index(drop=True)

        # 3. Deduplicate exact duplicate broadcasts
        df = df.drop_duplicates(subset=["mmsi", "parsed_time"])

        # Group by MMSI and build tracks
        vessel_tracks: List[VesselTrack] = []

        # Parse release window bounds for suspicious gap scoring
        t_rel_start = None
        t_rel_end = None
        if spill_release_start and spill_release_end:
            try:
                t_rel_start = pd.to_datetime(spill_release_start, utc=True)
                t_rel_end = pd.to_datetime(spill_release_end, utc=True)
            except Exception:
                pass

        for mmsi, group in df.groupby("mmsi"):
            if len(group) == 0:
                continue

            # Extract vessel metadata from first non-null entries
            name = str(group["vessel_name"].dropna().iloc[0]) if "vessel_name" in group and not group["vessel_name"].dropna().empty else f"Vessel-{mmsi}"
            vtype = str(group["vessel_type"].dropna().iloc[0]) if "vessel_type" in group and not group["vessel_type"].dropna().empty else "Commercial Vessel"
            imo = str(group["imo"].dropna().iloc[0]) if "imo" in group and not group["imo"].dropna().empty else None
            call_sign = str(group["call_sign"].dropna().iloc[0]) if "call_sign" in group and not group["call_sign"].dropna().empty else None
            length = float(group["length"].dropna().iloc[0]) if "length" in group and not group["length"].dropna().empty else None
            width = float(group["width"].dropna().iloc[0]) if "width" in group and not group["width"].dropna().empty else None
            draft = float(group["draft"].dropna().iloc[0]) if "draft" in group and not group["draft"].dropna().empty else None

            # Map vessel type code to friendly label if integer
            vtype_clean = self._map_vessel_type(vtype)

            points: List[AISPoint] = []
            gaps: List[AISGap] = []
            spoofing_alerts: List[SpoofingAlert] = []

            total_dist_nm = 0.0
            speeds: List[float] = []

            rows = group.to_dict(orient="records")
            prev_row = None

            for row in rows:
                p_time = row["parsed_time"]
                p_lat = float(row["lat"])
                p_lon = float(row["lon"])
                p_sog = float(row["sog"]) if "sog" in row and pd.notna(row["sog"]) else None
                p_cog = float(row["cog"]) if "cog" in row and pd.notna(row["cog"]) else None
                p_heading = float(row["heading"]) if "heading" in row and pd.notna(row["heading"]) else None

                if p_sog is not None and p_sog >= 0:
                    speeds.append(p_sog)

                if prev_row is not None:
                    prev_time = prev_row["parsed_time"]
                    prev_lat = float(prev_row["lat"])
                    prev_lon = float(prev_row["lon"])

                    dt_sec = (p_time - prev_time).total_seconds()
                    dt_hours = dt_sec / 3600.0
                    dt_min = dt_sec / 60.0

                    step_dist_km = haversine_distance_km(prev_lat, prev_lon, p_lat, p_lon)
                    step_dist_nm = step_dist_km / 1.852
                    total_dist_nm += step_dist_nm

                    # A. KINEMATIC SPOOFING DETECTION (Impossible Speed Jump)
                    if dt_sec > 10.0 and dt_hours > 0:
                        implied_speed_knots = step_dist_nm / dt_hours
                        if implied_speed_knots > self.max_speed_knots:
                            spoofing_alerts.append(SpoofingAlert(
                                type="KINEMATIC_JUMP",
                                timestamp=p_time.isoformat(),
                                description=f"Impossible speed jump of {implied_speed_knots:.1f} kt detected ({step_dist_nm:.1f} NM in {dt_min:.1f} min). Physical maximum is {self.max_speed_knots} kt.",
                                severity="HIGH",
                                implied_speed_knots=round(implied_speed_knots, 1),
                                coordinates=[p_lat, p_lon]
                            ))

                    # B. AIS TRANSMISSION GAP / DARK VESSEL DETECTION
                    if dt_min >= self.gap_threshold_min:
                        # Check if gap intersects release window
                        is_suspicious = False
                        reason = f"Normal AIS broadcast silence ({dt_min:.1f} min)"

                        if t_rel_start and t_rel_end:
                            # Overlap condition: gap_start <= release_end and gap_end >= release_start
                            overlaps_window = (prev_time <= t_rel_end) and (p_time >= t_rel_start)
                            
                            # Check proximity to origin zone if available
                            near_origin = True
                            if origin_lat is not None and origin_lon is not None:
                                d_start = haversine_distance_nm(prev_lat, prev_lon, origin_lat, origin_lon)
                                d_end = haversine_distance_nm(p_lat, p_lon, origin_lat, origin_lon)
                                near_origin = (min(d_start, d_end) <= 25.0)

                            if overlaps_window and near_origin:
                                is_suspicious = True
                                reason = f"CRITICAL: {dt_min:.0f}-minute AIS blackout coinciding with estimated oil spill release window near origin zone!"

                        gaps.append(AISGap(
                            start_time=prev_time.isoformat(),
                            end_time=p_time.isoformat(),
                            duration_min=round(dt_min, 1),
                            start_point=[prev_lat, prev_lon],
                            end_point=[p_lat, p_lon],
                            is_suspicious=is_suspicious,
                            reason=reason
                        ))

                    # C. FROZEN GPS ANOMALY (Ship underway with speed > 5 kt but identical coordinates)
                    if dt_min >= 20.0 and p_sog is not None and p_sog > 5.0 and step_dist_km < 0.05:
                        spoofing_alerts.append(SpoofingAlert(
                            type="GPS_STUCK",
                            timestamp=p_time.isoformat(),
                            description=f"GPS frozen anomaly: Vessel reports SOG {p_sog:.1f} kt underway but position remained unchanged for {dt_min:.1f} min.",
                            severity="MEDIUM",
                            implied_speed_knots=p_sog,
                            coordinates=[p_lat, p_lon]
                        ))

                points.append(AISPoint(
                    lat=round(p_lat, 6),
                    lon=round(p_lon, 6),
                    timestamp=p_time.isoformat(),
                    sog=round(p_sog, 1) if p_sog is not None else None,
                    cog=round(p_cog, 1) if p_cog is not None else None,
                    heading=round(p_heading, 1) if p_heading is not None else None
                ))

                prev_row = row

            avg_speed = round(float(np.mean(speeds)), 1) if speeds else 10.0

            vessel_tracks.append(VesselTrack(
                mmsi=mmsi,
                vessel_name=name,
                vessel_type=vtype_clean,
                imo=imo,
                call_sign=call_sign,
                length=length,
                width=width,
                draft=draft,
                points=points,
                total_distance_nm=round(total_dist_nm, 1),
                avg_speed_knots=avg_speed,
                gaps=gaps,
                spoofing_alerts=spoofing_alerts
            ))

        return vessel_tracks

    def _map_vessel_type(self, raw_type: Any) -> str:
        """Map MarineCadastre vessel type codes (numeric or string) to standard marine category."""
        type_str = str(raw_type).strip()
        
        # If numeric code
        try:
            code = int(float(type_str))
            if 80 <= code <= 89:
                return "Tanker (Crude/Chemical/Gas)"
            elif 70 <= code <= 79:
                return "Cargo / Container Carrier"
            elif 60 <= code <= 69:
                return "Passenger / Cruise"
            elif 30 <= code <= 39:
                return "Fishing Vessel"
            elif 50 <= code <= 59:
                return "Tug / Towing / Pilot"
            elif 90 <= code <= 99:
                return "Other Commercial Craft"
            else:
                return "Merchant Vessel"
        except ValueError:
            pass

        lower_t = type_str.lower()
        if "tanker" in lower_t:
            return "Tanker (Crude/Chemical)"
        elif "cargo" in lower_t or "container" in lower_t:
            return "Cargo / Container"
        elif "passenger" in lower_t:
            return "Passenger"
        elif "fish" in lower_t:
            return "Fishing"
        elif "tug" in lower_t:
            return "Tug / Service"
        return type_str
