import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState("");

  const startCamera = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);

      setError(
        "Unable to access the camera. Please allow camera permission and try again."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Indian Railway Wagon Detection</h1>
          <p>Live Wagon Number Recognition System</p>
        </div>

        <div
          className={`camera-status ${
            cameraActive ? "active" : "inactive"
          }`}
        >
          <span className="status-dot"></span>

          {cameraActive ? "Camera Active" : "Camera Inactive"}
        </div>
      </header>

      <main className="main-container">
        <section className="camera-card">
          <div className="camera-header">
            <div>
              <h2>Live Camera</h2>

              <p>
                Position the wagon number inside the detection area.
              </p>
            </div>
          </div>

          <div className="camera-container">
            {!cameraActive && (
              <div className="camera-placeholder">
                <div className="camera-icon">📷</div>

                <h3>Camera is not active</h3>

                <p>
                  Start the camera to begin wagon number detection.
                </p>

                <button
                  className="start-button"
                  onClick={startCamera}
                >
                  Start Camera
                </button>
              </div>
            )}

            <video
              ref={videoRef}
              className={`camera-video ${
                cameraActive ? "visible" : "hidden"
              }`}
              autoPlay
              playsInline
              muted
            />

            {cameraActive && (
              <>
                <div className="detection-box">
                  <div className="corner top-left"></div>
                  <div className="corner top-right"></div>
                  <div className="corner bottom-left"></div>
                  <div className="corner bottom-right"></div>

                  <span className="detection-label">
                    Position Wagon Number Here
                  </span>
                </div>

                <div className="camera-overlay">
                  <span>LIVE</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {cameraActive && (
            <div className="camera-actions">
              <button
                className="stop-button"
                onClick={stopCamera}
              >
                Stop Camera
              </button>
            </div>
          )}
        </section>

        <section className="result-card">
          <h2>Detection Result</h2>

          <div className="result-placeholder">
            <div className="result-icon">🔍</div>

            <h3>Waiting for wagon detection</h3>

            <p>
              YOLO and PaddleOCR will appear here in the next stage.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;