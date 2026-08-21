import { useEffect, useRef, useState } from "react";
import "./App.css";

import CameraPanel from "./components/CameraPanel";
import ResultPanel from "./components/ResultPanel";

const WS_URL = "ws://127.0.0.1:8000/ws/wagon-detection";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const websocketRef = useRef(null);

  const scanningRef = useRef(false);
  const processingRef = useRef(false);
  const nextFrameTimeoutRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [websocketConnected, setWebsocketConnected] =
    useState(false);

  const [detectionResult, setDetectionResult] =
    useState(null);

  const [resultVisible, setResultVisible] =
    useState(false);

  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  /*
   * Connect WebSocket
   */

  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      const websocket = new WebSocket(WS_URL);

      websocketRef.current = websocket;

      websocket.onopen = () => {
        console.log("WebSocket connected");

        setWebsocketConnected(true);

        resolve(websocket);
      };

      websocket.onmessage = (event) => {
        processingRef.current = false;

        try {
          const data = JSON.parse(event.data);

          console.log(
            "Backend response:",
            data
          );

          if (data.type === "wagon_detected") {
            const wagonNumber =
              data?.ocr?.wagon_number;

            const validation =
              data?.validation;

            const isValid =
              validation?.valid === true;

            /*
             * Successful scan
             */

            if (
              isValid &&
              wagonNumber &&
              wagonNumber.length === 11
            ) {
              console.log(
                "Wagon verified:",
                wagonNumber
              );

              setDetectionResult(data);
              setResultVisible(true);

              scanningRef.current = false;
              processingRef.current = false;

              setScanning(false);

              stopCamera();

              return;
            }

            /*
             * OCR result but not yet valid
             */

            setDetectionResult(data);
          }

          /*
           * No detection
           */

          if (data.type === "no_detection") {
            // Continue scanning.
          }

          /*
           * Backend error
           */

          if (data.type === "error") {
            console.error(
              "Backend error:",
              data.message
            );

            setError(
              data.message ||
                "Detection failed."
            );
          }

          /*
           * Send next frame
           */

          if (scanningRef.current) {
            scheduleNextFrame();
          }
        } catch (err) {
          console.error(
            "Unable to parse backend response:",
            err
          );

          processingRef.current = false;

          if (scanningRef.current) {
            scheduleNextFrame();
          }
        }
      };

      websocket.onerror = (event) => {
        console.error(
          "WebSocket error:",
          event
        );

        processingRef.current = false;

        setWebsocketConnected(false);

        setError(
          "Unable to connect to the wagon detection backend."
        );

        reject(
          new Error(
            "Unable to connect to the wagon detection backend."
          )
        );
      };

      websocket.onclose = () => {
        console.log(
          "WebSocket disconnected"
        );

        setWebsocketConnected(false);

        processingRef.current = false;
      };
    });
  };

  /*
   * Schedule next frame
   */

  const scheduleNextFrame = () => {
    if (!scanningRef.current) {
      return;
    }

    if (nextFrameTimeoutRef.current) {
      clearTimeout(
        nextFrameTimeoutRef.current
      );
    }

    nextFrameTimeoutRef.current =
      setTimeout(() => {
        sendFrame();
      }, 100);
  };

  /*
   * Send camera frame
   */

  const sendFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const websocket =
      websocketRef.current;

    if (!scanningRef.current) {
      return;
    }

    if (!video || !canvas || !websocket) {
      return;
    }

    if (
      websocket.readyState !==
      WebSocket.OPEN
    ) {
      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      scheduleNextFrame();
      return;
    }

    if (processingRef.current) {
      return;
    }

    processingRef.current = true;

    canvas.width = 640;
    canvas.height = 480;

    const context =
      canvas.getContext("2d");

    if (!context) {
      processingRef.current = false;

      scheduleNextFrame();

      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageData =
      canvas.toDataURL(
        "image/jpeg",
        0.65
      );

    try {
      websocket.send(imageData);

      console.log(
        "Camera frame sent"
      );
    } catch (err) {
      console.error(
        "Unable to send frame:",
        err
      );

      processingRef.current = false;
    }
  };

  /*
   * Start camera
   */

  const startCamera = async () => {
    try {
      setError("");

      setResultVisible(false);
      setDetectionResult(null);

      scanningRef.current = false;
      processingRef.current = false;

      await connectWebSocket();

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
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
          }
        );

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error(
          "Camera element is unavailable."
        );
      }

      videoRef.current.srcObject =
        stream;

      videoRef.current.onloadedmetadata =
        async () => {
          try {
            await videoRef.current.play();

            console.log(
              "Camera started:",
              videoRef.current.videoWidth,
              "x",
              videoRef.current.videoHeight
            );

            setCameraActive(true);
            setScanning(true);

            scanningRef.current = true;
            processingRef.current = false;

            sendFrame();
          } catch (err) {
            console.error(
              "Unable to start video:",
              err
            );

            setError(
              "Unable to start camera video."
            );
          }
        };
    } catch (err) {
      console.error(
        "Camera/WebSocket error:",
        err
      );

      setError(
        err.message ||
          "Unable to start camera."
      );

      scanningRef.current = false;
      processingRef.current = false;

      setScanning(false);
      setCameraActive(false);
      setWebsocketConnected(false);

      cleanupCamera();
      cleanupWebSocket();
    }
  };

  /*
   * Stop camera
   */

  const stopCamera = () => {
    scanningRef.current = false;
    processingRef.current = false;

    setScanning(false);
    setCameraActive(false);

    if (nextFrameTimeoutRef.current) {
      clearTimeout(
        nextFrameTimeoutRef.current
      );

      nextFrameTimeoutRef.current = null;
    }

    cleanupCamera();
    cleanupWebSocket();
  };

  /*
   * Camera cleanup
   */

  const cleanupCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /*
   * WebSocket cleanup
   */

  const cleanupWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();

      websocketRef.current = null;
    }

    setWebsocketConnected(false);
  };

  /*
   * Close result
   */

  const closeResult = () => {
    setResultVisible(false);
    setDetectionResult(null);
  };

  /*
   * Scan another wagon
   */

  const scanAnotherWagon = async () => {
    closeResult();

    stopCamera(false);

    setTimeout(() => {
      startCamera();
    }, 100);
  };

  /*
   * Component cleanup
   */

  useEffect(() => {
    return () => {
      scanningRef.current = false;
      processingRef.current = false;

      if (
        nextFrameTimeoutRef.current
      ) {
        clearTimeout(
          nextFrameTimeoutRef.current
        );
      }

      cleanupCamera();
      cleanupWebSocket();
    };
  }, []);

  return (
    <div className="app">

      <header className="header">

        <div>
          <h1>
            Indian Railway Wagon Detection
          </h1>

          <p>
            Live Wagon Number Recognition System
          </p>
        </div>

        <div
          className={`camera-status ${
            cameraActive
              ? "active"
              : "inactive"
          }`}
        >
          <span className="status-dot"></span>

          {cameraActive
            ? "Camera Active"
            : "Camera Inactive"}
        </div>

      </header>

      <main className="main-container">

        <CameraPanel
          videoRef={videoRef}
          canvasRef={canvasRef}
          cameraActive={cameraActive}
          websocketConnected={
            websocketConnected
          }
          scanning={scanning}
          error={error}
          startCamera={startCamera}
          stopCamera={() => {
            stopCamera();
            setDetectionResult(null);
            setResultVisible(false);
          }}
          isVerified={
            resultVisible &&
            detectionResult?.validation
              ?.valid === true
          }
        />

        <ResultPanel
          detectionResult={detectionResult}
          onClose={() => {
            setDetectionResult(null);
            setResultVisible(false);
          }}
          onScanAgain={() => {
            setDetectionResult(null);
            setResultVisible(false);
            startCamera();
          }}
        />

      </main>

    </div>
  );
}

export default App;