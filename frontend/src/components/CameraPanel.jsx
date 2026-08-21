function CameraPanel({
  videoRef,
  canvasRef,
  cameraActive,
  websocketConnected,
  scanning,
  error,
  startCamera,
  stopCamera,
  isVerified,
}) {
  return (
    <section className="camera-card">

      <div className="camera-header">

        <div>

          <h2>
            Live Camera
          </h2>

          <p>
            Position the wagon number
            inside the detection area.
          </p>

        </div>

      </div>

      <div className="camera-container">

        {!cameraActive && (

          <div className="camera-placeholder">

            <div className="camera-icon">
              📷
            </div>

            <h3>
              Camera is not active
            </h3>

            <p>
              Start the camera to begin
              wagon number detection.
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
            cameraActive
              ? "visible"
              : "hidden"
          }`}
          autoPlay
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          style={{
            display: "none",
          }}
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
              LIVE
            </div>

          </>

        )}

      </div>

      {cameraActive && (

        <div
          style={{
            padding: "10px 0",
            fontSize: "14px",
          }}
        >

          {websocketConnected ? (

            <span
              style={{
                color: "#087f5b",
                fontWeight: "600",
              }}
            >
              ● Backend Connected
            </span>

          ) : (

            <span
              style={{
                color: "#d9480f",
                fontWeight: "600",
              }}
            >
              ● Backend Disconnected
            </span>

          )}

        </div>

      )}

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

      {scanning && (

        <div
          style={{
            marginTop: "8px",
            color: "#6b7280",
            fontSize: "12px",
          }}
        >
          Scanning wagon number...
        </div>

      )}

      {!cameraActive &&
        isVerified && (

          <div
            style={{
              marginTop: "10px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "#ecfdf5",
              border:
                "1px solid #a7f3d0",
              color: "#047857",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            Wagon detected and verified.
            Camera stopped automatically.
          </div>

        )}

    </section>
  );
}

export default CameraPanel;