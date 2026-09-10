# SPILLX: AI-Powered Maritime Oil Spill Detection & AIS Vessel Correlation Platform

**Smart India Hackathon Problem Statement SIH26143**  
*Leveraging satellite imagery to detect oil spills and correlate with AIS data to identify the responsible vessel.*

---

## Executive Summary

**SPILLX** is an end-to-end maritime forensic intelligence web application designed for maritime law enforcement agencies (e.g., Indian Coast Guard, Directorate General of Shipping, Port State Control, IMO). It automatically:
1. **Detects oil spills** from satellite Synthetic Aperture Radar (SAR) imagery by isolating low-backscatter dampening anomalies caused by Marangoni surface-wave dampening.
2. **Backtracks the slick origin** using a simplified oceanographic Lagrangian drift simulation incorporating wind leeway, ocean currents, Coriolis deflection, and turbulent dispersion.
3. **Ingests & cleans vessel traffic data** dynamically from NOAA MarineCadastre AccessAIS CSV files, reconstructing spatio-temporal ship tracks.
4. **Correlates candidate vessels** against the estimated origin zone and discharge time window using an explainable multi-factor suspicion scoring engine.
5. **Flags evasion tactics**: Identifies intentional AIS transponder blackouts ("dark vessels") and detects kinematic position spoofing / impossible velocity jumps (> 35 knots).
6. **Produces tamper-evident legal dossiers**: Generates downloadable certified PDF forensic incident reports embedded with SHA-256 cryptographic hashes for admiralty court and Port State Control enforcement under MARPOL Annex I.

---

## System Architecture

```
                                +-----------------------------------+
                                |        SPILLX FRONTEND        |
                                |  React 18 + Tailwind CSS + Leaflet|
                                |   + Lucide Icons + Recharts       |
                                +-----------------+-----------------+
                                                  |
                                                  v REST APIs
                                +-----------------------------------+
                                |       FASTAPI BACKEND CORE        |
                                +-----------------+-----------------+
                                                  |
         +----------------------------------------+----------------------------------------+
         |                                        |                                        |
         v                                        v                                        v
+------------------------+              +------------------------+              +------------------------+
|   SAR Detector Module  |              |  AIS Engine & Spoofing |              | Drift & Correlation    |
| - Bilateral Filter     |              | - NOAA CSV Ingestion   |              | - Lagrangian Drift     |
| - CLAHE Enhancement    |              | - Spatio-Temporal Index|              | - Origin Uncertainty   |
| - Adaptive Threshold   |              | - Dark Vessel Blackout |              | - Multi-Factor Score   |
| - Geo-polygonization   |              | - Kinematic Spoofing   |              | - Explainable AI (XAI) |
+------------------------+              +------------------------+              +------------------------+
         |                                        |                                        |
         +----------------------------------------+----------------------------------------+
                                                  |
                                                  v
                                +-----------------------------------+
                                |    Forensic Report Generator      |
                                |   ReportLab PDF + SHA-256 Seal    |
                                +-----------------------------------+
```

---

## Key Modules & Mathematical Principles

### 1. SAR Satellite Oil Spill Detection Pipeline
Synthetic Aperture Radar (SAR) systems (such as ESA Sentinel-1 C-band VV polarization) rely on Bragg resonance with centimeter-scale ocean surface capillary waves. 
- When mineral oil (crude, heavy fuel oil, or untreated bilge sludge) is dumped, **Marangoni damping** sharply reduces surface tension and suppresses capillary waves.
- The sea surface becomes specular, reflecting radar pulses away from the receiver and creating prominent **dark low-backscatter patches**.
- **Processing Steps**:
  1. *Speckle noise attenuation*: Bilateral edge-preserving filter ($d=9, \sigma_r=75$).
  2. *Contrast enhancement*: Contrast Limited Adaptive Histogram Equalization (CLAHE).
  3. *Adaptive segmentation*: Statistical threshold $T = \mu - (1.1 - 0.7 \cdot \text{sensitivity}) \cdot \sigma$.
  4. *Morphological cleaning*: Elliptical morphological closing and opening to eliminate solitary speckle points.
  5. *Georeferencing*: Mapping pixel coordinates $[x, y]$ to geographic bounds $[\text{lat}, \text{lon}]$, extracting surface area ($km^2$), perimeter ($km$), centroid, and physics confidence score.

---

### 2. Backward Lagrangian Drift Simulation (Origin Estimation)
To determine where an observed slick was discharged $H$ hours prior to satellite overpass, we integrate backwards using a Lagrangian drift formulation:

$$\vec{V}_{\text{drift}} = \vec{V}_{\text{current}} + \alpha \cdot \mathbf{R}(\theta_c) \vec{V}_{\text{wind}}$$

Where:
- $\vec{V}_{\text{current}}$ is the sea surface current velocity vector.
- $\vec{V}_{\text{wind}}$ is the 10-meter surface wind vector acting downwind.
- $\alpha = 0.032$ is the empirical wind leeway coefficient ($3.2\%$ of 10m wind speed).
- $\theta_c = +12^\circ$ is the Coriolis deflection angle to the right of the wind in the Northern Hemisphere.
- $\mathbf{R}(\theta_c) = \begin{bmatrix} \cos(\theta_c) & -\sin(\theta_c) \\ \sin(\theta_c) & \cos(\theta_c) \end{bmatrix}$ is the 2D rotation matrix.

**Reverse Integration**:
$$\vec{X}(t - \Delta t) = \vec{X}(t) - \vec{V}_{\text{drift}} \Delta t$$

**Uncertainty & Dispersion Envelope**:
Because atmospheric turbulence and turbulent ocean diffusion cause position uncertainty to accumulate over time, the dispersion radius expands as:
$$R(\tau) = R_0 + k_{\text{disp}} \sqrt{\tau}$$
Where $R_0$ is initial detected radius and $k_{\text{disp}} \approx 0.85\text{ km}/\sqrt{\text{hour}}$. The resulting probable origin zone forms an uncertainty ellipse surrounding the trajectory.

---

### 3. Culprit Suspicion Correlation & Explainable Scoring
Every candidate vessel track is evaluated using a weighted multi-criteria function:

$$\text{Suspicion Score} = w_{\text{prox}} S_{\text{prox}} + w_{\text{temp}} S_{\text{temp}} + w_{\text{gap}} S_{\text{gap}} + w_{\text{anom}} S_{\text{anom}}$$

- **Spatial Proximity Score ($S_{\text{prox}} \in [0, 100]$)**:
  - If ship crossed inside origin polygon: $S_{\text{prox}} = 100$.
  - Otherwise exponential distance decay: $S_{\text{prox}} = 100 \cdot \exp(-d_{\text{CPA}} / 6.0\text{ km})$.
- **Temporal Alignment Score ($S_{\text{temp}} \in [0, 100]$)**:
  - Evaluates whether the Closest Point of Approach (CPA) occurred during the estimated spill release window $[T_{\text{start}}, T_{\text{end}}]$.
- **AIS Blackout Gap Score ($S_{\text{gap}} \in [0, 100]$)**:
  - Class A transponders underway must broadcast every 2-10 seconds.
  - Blackout intervals $> 30$ minutes occurring during the release window and in proximity to the origin zone are flagged as high-risk evasive behavior.
- **Behavioral Anomaly Score ($S_{\text{anom}} \in [0, 100]$)**:
  - *Speed Drop*: Detects sudden deceleration (e.g. cruising at $14$ kt, slowing to $4$ kt to run bilge separator bypass).
  - *Ship Type Factor*: Higher regulatory scrutiny for crude/chemical tankers under MARPOL Annex I.

**Explainable Breakdown**: Every vessel profile presents an interactive breakdown bar showing the exact percentage contribution from each factor.

---

### 4. AIS Position Spoofing & Teleportation Detection (Key Differentiator)
SPILLX evaluates physical feasibility between consecutive position broadcasts:
$$v_{\text{implied}} = \frac{\Delta d}{\Delta t}$$
- If $v_{\text{implied}} > 35.0\text{ knots}$ for commercial cargo/tanker vessels without high-speed craft registration, it immediately flags a **"Kinematic Infeasibility / Impossible Speed Jump"** spoofing alert.
- Detects static coordinate locks (frozen GPS coordinates while engine status is reported underway).

---

### 5. Automated Chain-of-Custody Forensic Evidence Report
Clicking **"Generate Forensic Report"** generates a downloadable PDF dossier containing:
- Complete incident parameters, satellite sensor profile, and slick surface geometry.
- Net environmental drift vectors and origin uncertainty coordinates.
- Ranked suspect leaderboard with explainable score breakdowns.
- Deep-dive dossier on the primary culprit (vessel specs, trajectory, speed drop, blackout intervals).
- **Cryptographic SHA-256 Tamper-Evidence Seal**: Certified checksum of incident parameters ensuring unalterable chain-of-custody for legal proceedings under MARPOL 73/78 Annex I.

---

## Quickstart & How to Run

### Requirements
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ (Tested on Node 24)

### Method 1: Unified Single-Command Launch (Recommended)
Launch both backend and frontend automatically in a single command:
```bash
python run.py
```
*Or double-click `start_app.bat` on Windows.*

This will:
1. Start the FastAPI server on `http://localhost:8000`.
2. Serve the compiled high-performance React SPA.
3. Automatically open `http://localhost:8000` in your default browser!

### Method 2: Development Mode (Hot Reloading)
**Terminal 1 (Backend)**:
```bash
uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 (Frontend)**:
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173`.

---

## 2-Minute Demo Walkthrough for Judges

1. **Launch Dashboard**: Open `http://localhost:8000`.
2. **Observe Scenario 1 (Gulf of Mexico)**:
   - Notice the detected SAR slick polygon in neon cyan on the dark nautical map.
   - Notice the backward drift trajectory arrows and the pulsating amber **Probable Origin Zone**.
   - Notice the color-coded vessel tracks (Red = High Suspicion, Amber = Medium, Green = Low).
3. **Inspect the Leaderboard**:
   - Primary Culprit **"OCEAN TITAN" (MMSI: 368123456)** is ranked #1 with **95.4% Suspicion Score**.
   - Expand its dossier: Notice the **"DARK TRANSIT"** tag (75-minute AIS blackout during release window) and the speed reduction from $13.1$ to $4.2$ kt.
   - Notice **"SEA PHANTOM"** flagged for **Kinematic Position Spoofing** ($46.2$ kt teleportation jump).
4. **Interactive Timeline Scrubbing**:
   - Click **Play** on the timeline scrubber at the bottom to watch the vessels move chronologically relative to the spill release window and blackout period.
5. **Dynamic Weights Tuning**:
   - Click the sliders icon on the leaderboard. Adjust Proximity or Gap weights to watch scores recalculate live.
6. **Live "Simulate Dark Vessel" Toggle**:
   - Click **Simulate Dark Vessel** to test live transponder blackout removal on candidate vessels.
7. **Generate Official PDF Report**:
   - Click **Generate Forensic Report** in the top navigation.
   - Preview the incident dossier with its **SHA-256 seal**.
   - Click **Download Official Forensic PDF Report** to download the signed PDF evidence dossier.

---

## Dataset Attribution
- **AIS Traffic Data**: NOAA MarineCadastre AccessAIS (`https://marinecadastre.gov/accessais/`).
- **Satellite Radar Imagery**: European Space Agency (ESA) Copernicus Sentinel-1 C-band SAR.

---

## License & Compliance
Built for the Smart India Hackathon (Problem Statement SIH26143).  
Designed in compliance with IMO MARPOL 73/78 Annex I & UNCLOS Article 217.
