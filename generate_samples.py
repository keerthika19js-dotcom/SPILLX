import os
import cv2
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from backend.services.sar_detector import SARSpillDetector

os.makedirs("sample_data/sar_images", exist_ok=True)

print("Generating realistic NOAA MarineCadastre CSV...")

records = []
t_base = datetime.fromisoformat("2026-09-09T19:30:00+00:00")
lat_start, lon_start = 27.9600, -91.2600

# Vessel 1: OCEAN TITAN (MMSI: 368123456) - Culprit Tanker
for i in range(12):
    t_curr = t_base + timedelta(minutes=i * 8)
    lat = lat_start + i * 0.0050
    lon = lon_start + i * 0.0150
    sog = 14.2 if i < 10 else 6.5
    records.append({
        "MMSI": 368123456, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": sog, "COG": 68.0, "Heading": 68.0,
        "VesselName": "OCEAN TITAN", "IMO": "IMO9842109", "CallSign": "WDC4412",
        "VesselType": 80, "Status": 0, "Length": 274, "Width": 48, "Draft": 15.2, "Cargo": "Crude Oil"
    })

t_resume = t_base + timedelta(minutes=11 * 8 + 75)
lat_resume, lon_resume = 28.0320, -90.9950

for i in range(14):
    t_curr = t_resume + timedelta(minutes=i * 8)
    lat = lat_resume + i * 0.0062
    lon = lon_resume + i * 0.0165
    sog = 9.8 if i == 0 else 13.8
    records.append({
        "MMSI": 368123456, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": sog, "COG": 65.0, "Heading": 66.0,
        "VesselName": "OCEAN TITAN", "IMO": "IMO9842109", "CallSign": "WDC4412",
        "VesselType": 80, "Status": 0, "Length": 274, "Width": 48, "Draft": 15.2, "Cargo": "Crude Oil"
    })

# Vessel 2: SEA PHANTOM (MMSI: 338987654) - Kinematic Spoofing Jump
for i in range(24):
    t_curr = t_base + timedelta(minutes=i * 10)
    lat = 27.8900 + i * 0.0040
    lon = -91.2000 + i * 0.0140
    sog = 16.0
    if i == 14:
        lat += 0.0900
        lon += 0.0850
    records.append({
        "MMSI": 338987654, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": sog, "COG": 72.0, "Heading": 73.0,
        "VesselName": "SEA PHANTOM", "IMO": "IMO9712345", "CallSign": "KLR8890",
        "VesselType": 70, "Status": 0, "Length": 295, "Width": 40, "Draft": 12.5, "Cargo": "Containers"
    })

# Vessel 3: PACIFIC TRADER (MMSI: 413555888) - Cargo vessel, 15 km away
for i in range(26):
    t_curr = t_base + timedelta(minutes=i * 9)
    lat = 28.1800 + i * 0.0035
    lon = -91.3000 + i * 0.0160
    records.append({
        "MMSI": 413555888, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": 15.5, "COG": 75.0, "Heading": 75.0,
        "VesselName": "PACIFIC TRADER", "IMO": "IMO9654321", "CallSign": "VRHJ3",
        "VesselType": 70, "Status": 0, "Length": 225, "Width": 32, "Draft": 11.0, "Cargo": "General Cargo"
    })

# Vessel 4: GULF HARVESTER (MMSI: 367444111) - Fishing boat
for i in range(22):
    t_curr = t_base + timedelta(minutes=i * 12)
    lat = 27.7800 + 0.015 * np.sin(i * 0.4)
    lon = -90.9500 + 0.015 * np.cos(i * 0.4)
    records.append({
        "MMSI": 367444111, "BaseDateTime": t_curr.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "LAT": round(lat, 5), "LON": round(lon, 5), "SOG": 4.1, "COG": 120.0, "Heading": 120.0,
        "VesselName": "GULF HARVESTER", "IMO": "N/A", "CallSign": "WDA1234",
        "VesselType": 30, "Status": 7, "Length": 38, "Width": 8, "Draft": 3.5, "Cargo": "Fish"
    })

# Vessel 5: DELTA PIONEER (MMSI: 356889001) - Offshore supply tug
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

# Vessel 6: NORDIC HORIZON (MMSI: 219001234) - Passed hours earlier
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
print("Sample AIS CSV generated: " + str(len(df_ais)) + " records across " + str(df_ais["MMSI"].nunique()) + " vessels.")

detector = SARSpillDetector()

img1_bytes = detector.generate_synthetic_sar_image(512, 512, slick_type="trailing_bilge_slick")
with open("sample_data/sar_images/gulf_of_mexico_sentinel1.png", "wb") as f:
    f.write(img1_bytes)

img2_bytes = detector.generate_synthetic_sar_image(512, 512, slick_type="diffuse_slick")
with open("sample_data/sar_images/singapore_strait_sentinel1.png", "wb") as f:
    f.write(img2_bytes)

img3_bytes = detector.generate_synthetic_sar_image(512, 512, slick_type="english_channel_slick")
with open("sample_data/sar_images/english_channel_sentinel1.png", "wb") as f:
    f.write(img3_bytes)

print("Sample SAR images generated in sample_data/sar_images/")
