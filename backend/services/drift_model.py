import math
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Any
from ..models.schemas import DriftRequest, DriftResult, DriftTrajectoryPoint, GeoPoint

class LagrangianDriftSimulator:
    """
    Simplified Lagrangian Reverse Drift Model for Oil Spill Origin Estimation.
    
    Physical Principles:
    1. Net Drift Velocity (V_drift):
       V_drift = V_current + alpha * R(theta_c) * V_wind
       - V_current: Surface ocean current velocity vector
       - V_wind: 10-meter wind velocity vector (acts downwind)
       - alpha: Leeway factor (typically 3.0% - 3.5%, default 0.032)
       - theta_c: Coriolis leeway deflection angle (Northern Hemisphere deflections 0-15° right)
       - R(theta_c): 2D rotation matrix for Coriolis deflection
       
    2. Backward Time Integration:
       Given the detected slick centroid position X(T_detect), we trace backwards in time:
       X(t - dt) = X(t) - V_drift * dt
       
    3. Uncertainty Propagation & Dispersion:
       Atmospheric turbulence, current eddies, and turbulent diffusion cause the position
       uncertainty to expand backwards in time:
       Radius(t) = R_0 + k_disp * sqrt(t_hours)
       The probable origin zone is the spatial envelope encompassing the trajectory
       expanded by this uncertainty radius during the estimated release window.
    """

    def __init__(self):
        pass

    def simulate_backward_drift(self, request: DriftRequest) -> DriftResult:
        """
        Run backward Lagrangian trajectory integration from detected spill position.
        """
        # Parse detection timestamp
        try:
            # Handle ISO string with or without 'Z'
            clean_time_str = request.spill_time.replace("Z", "+00:00")
            t_detect = datetime.fromisoformat(clean_time_str)
        except Exception:
            t_detect = datetime.utcnow()

        # Environmental Vector Calculations
        # Wind: Direction FROM which wind blows -> downwind direction is +180 deg
        downwind_dir_deg = (request.wind_direction_deg + 180.0) % 360.0
        
        # In Northern Hemisphere, Coriolis force deflects wind-driven drift 10-15 deg right
        coriolis_deflection_deg = 12.0 if request.spill_centroid.lat >= 0 else -12.0
        effective_wind_dir_deg = (downwind_dir_deg + coriolis_deflection_deg) % 360.0
        
        # Convert angles to radians (0 deg = North = +Y, 90 deg = East = +X)
        wind_rad = math.radians(effective_wind_dir_deg)
        current_rad = math.radians(request.current_direction_deg)

        # Wind velocity components (knots)
        # Note: sin for East (X), cos for North (Y)
        wind_u = (request.wind_speed_knots * request.leeway_factor) * math.sin(wind_rad)
        wind_v = (request.wind_speed_knots * request.leeway_factor) * math.cos(wind_rad)

        # Current velocity components (knots)
        curr_u = request.current_speed_knots * math.sin(current_rad)
        curr_v = request.current_speed_knots * math.cos(current_rad)

        # Net forward drift velocity vector (knots)
        net_u_knots = curr_u + wind_u
        net_v_knots = curr_v + wind_v
        net_speed_knots = math.hypot(net_u_knots, net_v_knots)
        net_bearing_deg = (math.degrees(math.atan2(net_u_knots, net_v_knots)) + 360.0) % 360.0

        # Backward integration: reverse direction
        # Reverse velocity components in knots
        rev_u_knots = -net_u_knots
        rev_v_knots = -net_v_knots

        # Step integration backwards
        total_hours = max(1.0, min(48.0, request.drift_hours))
        num_steps = 12
        dt_hours = total_hours / float(num_steps)

        curr_lat = request.spill_centroid.lat
        curr_lon = request.spill_centroid.lon

        # Base physical dispersion constants
        r0_km = 1.2 # initial detection slick radius
        k_disp = 0.85 # turbulent diffusion coefficient (km / sqrt(hour))

        trajectory: List[DriftTrajectoryPoint] = []
        
        # Step 0: Detection moment
        trajectory.append(DriftTrajectoryPoint(
            step_hours_ago=0.0,
            timestamp=t_detect.isoformat(),
            lat=round(curr_lat, 6),
            lon=round(curr_lon, 6),
            dispersion_radius_km=round(r0_km, 2)
        ))

        # Nautical miles conversion factors
        # 1 NM = 1 minute of latitude = 1.852 km
        # 1 deg latitude = 60 NM
        for step in range(1, num_steps + 1):
            h_ago = step * dt_hours
            step_time = t_detect - timedelta(hours=h_ago)

            # Distance traveled in nautical miles during this time interval
            dx_nm = rev_u_knots * (dt_hours)
            dy_nm = rev_v_knots * (dt_hours)

            # Coordinate updates
            # dLat = dy_nm / 60.0
            # dLon = dx_nm / (60.0 * cos(lat))
            d_lat = dy_nm / 60.0
            avg_lat_rad = math.radians(curr_lat)
            d_lon = dx_nm / (60.0 * math.cos(avg_lat_rad))

            curr_lat += d_lat
            curr_lon += d_lon

            # Dispersion uncertainty envelope expands with sqrt of elapsed time
            dispersion_r_km = r0_km + k_disp * math.sqrt(h_ago)

            trajectory.append(DriftTrajectoryPoint(
                step_hours_ago=round(h_ago, 2),
                timestamp=step_time.isoformat(),
                lat=round(curr_lat, 6),
                lon=round(curr_lon, 6),
                dispersion_radius_km=round(dispersion_r_km, 2)
            ))

        # Origin point at nominal drift duration
        origin_pt = trajectory[-1]
        origin_centroid = GeoPoint(lat=origin_pt.lat, lon=origin_pt.lon)

        # Build Probable Origin Zone Polygon
        # The origin zone represents the uncertainty ellipse around the origin point
        # with an elongation along the drift track vector
        origin_disp_km = origin_pt.dispersion_radius_km
        origin_zone_polygon = self._generate_origin_ellipse(
            center_lat=origin_pt.lat,
            center_lon=origin_pt.lon,
            semi_major_km=origin_disp_km * 1.35, # stretched along drift axis
            semi_minor_km=origin_disp_km * 0.95,
            bearing_deg=net_bearing_deg,
            num_points=24
        )

        # Estimated Release Window:
        # Based on physical oil spreading / weathering models (Fay & Mackay model),
        # an observed surface slick of this scale took between (total_hours * 0.75)
        # to (total_hours * 1.25) to drift and expand to observed footprint.
        release_window_span = max(1.5, total_hours * 0.25)
        rel_start = t_detect - timedelta(hours=total_hours + release_window_span)
        rel_end = t_detect - timedelta(hours=max(0.5, total_hours - release_window_span))
        rel_mid = t_detect - timedelta(hours=total_hours)

        return DriftResult(
            trajectory=trajectory,
            probable_origin_zone=origin_zone_polygon,
            origin_centroid=origin_centroid,
            estimated_release_start=rel_start.isoformat(),
            estimated_release_end=rel_end.isoformat(),
            release_window_midpoint=rel_mid.isoformat(),
            net_drift_vector_knots=round(net_speed_knots, 2),
            net_drift_bearing_deg=round(net_bearing_deg, 1),
            drift_hours=total_hours,
            dispersion_radius_km=round(origin_disp_km, 2)
        )

    def _generate_origin_ellipse(
        self,
        center_lat: float,
        center_lon: float,
        semi_major_km: float,
        semi_minor_km: float,
        bearing_deg: float,
        num_points: int = 24
    ) -> List[List[float]]:
        """
        Generate oriented elliptical polygon vertices in [lat, lon] coordinates.
        """
        poly_pts: List[List[float]] = []
        deg_lat_km = 111.139
        deg_lon_km = 111.139 * math.cos(math.radians(center_lat))

        bearing_rad = math.radians(bearing_deg)
        cos_b = math.cos(bearing_rad)
        sin_b = math.sin(bearing_rad)

        for i in range(num_points):
            theta = 2.0 * math.pi * i / float(num_points)
            # Local coordinates before rotation
            x_local = semi_minor_km * math.cos(theta)
            y_local = semi_major_km * math.sin(theta)

            # Rotate by drift bearing
            dx_km = x_local * cos_b - y_local * sin_b
            dy_km = x_local * sin_b + y_local * cos_b

            pt_lat = center_lat + (dy_km / deg_lat_km)
            pt_lon = center_lon + (dx_km / deg_lon_km)
            poly_pts.append([round(pt_lat, 6), round(pt_lon, 6)])

        # Close polygon
        poly_pts.append(poly_pts[0])
        return poly_pts
