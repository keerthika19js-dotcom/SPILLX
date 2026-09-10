import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

print("Regenerating calibrated sample NOAA AIS CSV...")

records = []
t_base = datetime.fromisoformat("2026-09-09T19:00:00+00:00")

# Origin centroid is approximately [27.9291, -91.0572]
# Release window midpoint is ~ 2026-09-09T20:15:00 UTC

# 1. OCEAN TITAN (MMSI: 368123456) - Culprit Tanker
# Enters origin zone, decelerates from 14.5 to 4.2 kt, turns off AIS for 75 mins, resumes course
for i in range(10):
    t_curr = t_base + timedelta(minutes=i * 8)
    lat = 27.8850 + i * 0.0042
    lon = -91.2100 + i * 0.0150
    sog = 14.5 if i < 8 else 4.2 # deceleration right before blackout!
    records.append({
        "MMSI": 368123456, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": sog, "COG": 67.0, "Heading": 68.0,
        "VesselName": "OCEAN TITAN", "IMO": "IMO9842109", "CallSign": "WDC4412",
        "VesselType": 80, "Status": 0, "Length": 274, "Width": 48, "Draft": 15.2, "Cargo": "Crude Oil"
    })

# 75-minute blackout right during transit through origin zone (20:12 to 21:27 UTC)
t_resume = t_base + timedelta(minutes=9 * 8 + 75)
lat_resume, lon_resume = 27.9420, -91.0100 # directly across origin zone

for i in range(14):
    t_curr = t_resume + timedelta(minutes=i * 8)
    lat = lat_resume + i * 0.0048
    lon = lon_resume + i * 0.0160
    sog = 8.5 if i == 0 else 14.0
    records.append({
        "MMSI": 368123456, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": sog, "COG": 66.0, "Heading": 66.0,
        "VesselName": "OCEAN TITAN", "IMO": "IMO9842109", "CallSign": "WDC4412",
        "VesselType": 80, "Status": 0, "Length": 274, "Width": 48, "Draft": 15.2, "Cargo": "Crude Oil"
    })

# 2. SEA PHANTOM (MMSI: 338987654) - Container ship with Kinematic Spoofing Jump (12 km south)
for i in range(24):
    t_curr = t_base + timedelta(minutes=i * 10)
    lat = 27.8100 + i * 0.0035
    lon = -91.2200 + i * 0.0145
    sog = 16.0
    # Step 14 impossible jump
    if i == 14:
        lat += 0.0800
        lon += 0.0750
    records.append({
        "MMSI": 338987654, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": sog, "COG": 74.0, "Heading": 74.0,
        "VesselName": "SEA PHANTOM", "IMO": "IMO9712345", "CallSign": "KLR8890",
        "VesselType": 70, "Status": 0, "Length": 295, "Width": 40, "Draft": 12.5, "Cargo": "Containers"
    })

# 3. PACIFIC TRADER (MMSI: 413555888) - Cargo vessel, 16 km north
for i in range(26):
    t_curr = t_base + timedelta(minutes=i * 9)
    lat = 28.0500 + i * 0.0030
    lon = -91.2800 + i * 0.0155
    records.append({
        "MMSI": 413555888, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": 15.2, "COG": 72.0, "Heading": 72.0,
        "VesselName": "PACIFIC TRADER", "IMO": "IMO9654321", "CallSign": "VRHJ3",
        "VesselType": 70, "Status": 0, "Length": 225, "Width": 32, "Draft": 11.0, "Cargo": "General Cargo"
    })

# 4. GULF HARVESTER (MMSI: 367444111) - Fishing boat trawling 22 km south
for i in range(22):
    t_curr = t_base + timedelta(minutes=i * 12)
    lat = 27.7200 + 0.012 * np.sin(i * 0.4)
    lon = -90.9500 + 0.012 * np.cos(i * 0.4)
    records.append({
        "MMSI": 367444111, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": 4.1, "COG": 120.0, "Heading": 120.0,
        "VesselName": "GULF HARVESTER", "IMO": "N/A", "CallSign": "WDA1234",
        "VesselType": 30, "Status": 7, "Length": 38, "Width": 8, "Draft": 3.5, "Cargo": "Fish"
    })

# 5. DELTA PIONEER (MMSI: 356889001) - Offshore supply tug 20 km east
for i in range(20):
    t_curr = t_base + timedelta(minutes=i * 11)
    lat = 27.9500 + i * 0.0020
    lon = -90.7200 + i * 0.0030
    records.append({
        "MMSI": 356889001, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": 10.2, "COG": 40.0, "Heading": 42.0,
        "VesselName": "DELTA PIONEER", "IMO": "IMO9500112", "CallSign": "HP8901",
        "VesselType": 52, "Status": 0, "Length": 65, "Width": 16, "Draft": 5.8, "Cargo": "Deck Equipment"
    })

# 6. NORDIC HORIZON (MMSI: 219001234) - Passed 5 hours earlier
for i in range(16):
    t_curr = t_base - timedelta(hours=5) + timedelta(minutes=i * 10)
    lat = 28.0200 + i * 0.0060
    lon = -91.2500 + i * 0.0180
    records.append({
        "MMSI": 219001234, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": 14.8, "COG": 67.0, "Heading": 67.0,
        "VesselName": "NORDIC HORIZON", "IMO": "IMO9432111", "CallSign": "OXLM4",
        "VesselType": 70, "Status": 0, "Length": 229, "Width": 32, "Draft": 13.0, "Cargo": "Grain"
    })

df_ais = pd.DataFrame(records)
df_ais.to_csv("sample_data/ais_noaa_sample.csv", index=False)
print("Updated sample AIS CSV saved successfully!")
