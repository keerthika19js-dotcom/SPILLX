import uvicorn
import webbrowser
import time
import threading

def open_browser():
    time.sleep(1.5)
    print("\n[SPILLX] Opening browser at http://localhost:8000 ...")
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    print("=" * 70)
    print("  SPILLX: AI Maritime Oil Spill Detection & AIS Correlation")
    print("  Smart India Hackathon Problem Statement SIH26143")
    print("=" * 70)
    print("  Starting unified full-stack server on http://localhost:8000 ...")
    print("  - Tactical Investigation Dashboard: http://localhost:8000")
    print("  - Interactive API Documentation:    http://localhost:8000/docs")
    print("=" * 70)

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
