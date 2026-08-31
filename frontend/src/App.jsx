import { useEffect, useRef, useState } from "react";
import "./App.css";

import CameraPanel from "./components/CameraPanel";
import ResultPanel from "./components/ResultPanel";
import RailwayRecordForm from "./components/RailwayRecordForm";
import ScannedWagons from "./components/ScannedWagons";

const WS_URL = "ws://127.0.0.1:8000/ws/wagon-detection";
const API_URL = "http://127.0.0.1:8000";

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

  const [activeRecord, setActiveRecord] =
    useState(null);

  const [inspectionStarted, setInspectionStarted] =
    useState(false);

  const [recordLoading, setRecordLoading] =
    useState(true);

  const [scannedWagons, setScannedWagons] =
    useState([]);

  const [savingWagons, setSavingWagons] =
    useState(false);

  const getDraftStorageKey = (recordId) => {
    return `wagon_drafts_record_${recordId}`;
  };

  const loadActiveRecord = async () => {
    try {
      setRecordLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/railway-records/active`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load active railway record."
        );
      }

      const record = await response.json();

      if (record) {
        setActiveRecord(record);
        setInspectionStarted(true);
      } else {
        setActiveRecord(null);
        setInspectionStarted(false);
        setScannedWagons([]);
      }
    } catch (err) {
      console.error(
        "Unable to load active railway record:",
        err
      );

      setError(
        err.message ||
          "Unable to load railway record."
      );

      setActiveRecord(null);
      setInspectionStarted(false);
      setScannedWagons([]);
    } finally {
      setRecordLoading(false);
    }
  };

  const handleRecordCreated = (record) => {
    setActiveRecord(record);
    setInspectionStarted(true);
    setScannedWagons([]);
    setDetectionResult(null);
    setResultVisible(false);
    setError("");

    localStorage.removeItem(
      getDraftStorageKey(record.id)
    );
  };

  useEffect(() => {
    if (!activeRecord?.id) {
      setScannedWagons([]);
      return;
    }

    const storageKey = getDraftStorageKey(
      activeRecord.id
    );

    try {
      const stored =
        localStorage.getItem(storageKey);

      if (!stored) {
        setScannedWagons([]);
        return;
      }

      const parsed = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        setScannedWagons(parsed);
      } else {
        setScannedWagons([]);
      }
    } catch (err) {
      console.error(
        "Unable to load wagon drafts:",
        err
      );

      setScannedWagons([]);
    }
  }, [activeRecord?.id]);

  useEffect(() => {
    if (!activeRecord?.id) {
      return;
    }

    const storageKey = getDraftStorageKey(
      activeRecord.id
    );

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(scannedWagons)
      );
    } catch (err) {
      console.error(
        "Unable to save wagon drafts locally:",
        err
      );
    }
  }, [
    activeRecord?.id,
    scannedWagons,
  ]);

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

  const cleanupWebSocket = () => {
    if (websocketRef.current) {
      try {
        websocketRef.current.close();
      } catch (err) {
        console.error(
          "Unable to close WebSocket:",
          err
        );
      }

      websocketRef.current = null;
    }

    setWebsocketConnected(false);
  };

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

  const sendFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const websocket = websocketRef.current;

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
    } catch (err) {
      console.error(
        "Unable to send frame:",
        err
      );

      processingRef.current = false;

      setError(
        "Unable to send camera frame to the detection service."
      );

      scanningRef.current = false;
      setScanning(false);

      stopCamera();
    }
  };

  const addVerifiedWagon = (data) => {
    const wagonNumber =
      data?.ocr?.wagon_number;

    if (
      !wagonNumber ||
      wagonNumber.length !== 11
    ) {
      return false;
    }

    if (data?.verified !== true) {
      return false;
    }

    if (
      data?.validation?.valid !== true
    ) {
      return false;
    }

    const metadata = data?.metadata;

    const newWagon = {
      local_id:
        `${Date.now()}-${wagonNumber}`,

      wagon_no:
        wagonNumber,

      wagon_type:
        metadata?.wagon_type?.name ||
        "",

      wagon_owning:
        metadata?.owner?.name ||
        "",

      gross: "",
      tare: "",
      load: "",
      other: "",

      detected_at:
        new Date().toISOString(),
    };

    let added = false;

    setScannedWagons((current) => {
      const alreadyExists =
        current.some(
          (wagon) =>
            wagon.wagon_no ===
            wagonNumber
        );

      if (alreadyExists) {
        setError(
          `Wagon ${wagonNumber} is already in the scan list.`
        );

        return current;
      }

      added = true;

      return [
        ...current,
        newWagon,
      ];
    });

    return added;
  };

  const connectWebSocket = () => {
    return new Promise(
      (resolve, reject) => {
        if (!activeRecord?.id) {
          reject(
            new Error(
              "No active railway record found."
            )
          );

          return;
        }

        const websocket =
          new WebSocket(
            `${WS_URL}?record_id=${activeRecord.id}`
          );

        websocketRef.current =
          websocket;

        websocket.onopen = () => {
          console.log(
            "WebSocket connected"
          );

          setWebsocketConnected(
            true
          );

          resolve(websocket);
        };

        websocket.onmessage = (
          event
        ) => {
          processingRef.current =
            false;

          try {
            const data =
              JSON.parse(
                event.data
              );

            console.log(
              "Backend response:",
              data
            );

            if (
              data.type ===
              "wagon_detected"
            ) {
              const wagonNumber =
                data?.ocr
                  ?.wagon_number;

              const validation =
                data?.validation;

              const isValid =
                validation?.valid ===
                true;

              if (
                isValid &&
                wagonNumber &&
                wagonNumber.length ===
                  11 &&
                data?.verified ===
                  true
              ) {
                const added =
                  addVerifiedWagon(
                    data
                  );

                if (added) {
                  setDetectionResult(
                    data
                  );

                  setResultVisible(
                    true
                  );

                  setError("");

                  scanningRef.current =
                    false;

                  processingRef.current =
                    false;

                  setScanning(false);

                  stopCamera();
                }

                return;
              }

              if (
                wagonNumber &&
                validation?.valid ===
                  false
              ) {
                setDetectionResult(
                  data
                );

                if (
                  scanningRef.current
                ) {
                  scheduleNextFrame();
                }

                return;
              }

              setDetectionResult(
                data
              );

              if (
                scanningRef.current
              ) {
                scheduleNextFrame();
              }

              return;
            }

            if (
              data.type ===
              "no_detection"
            ) {
              setDetectionResult(
                null
              );

              if (
                scanningRef.current
              ) {
                scheduleNextFrame();
              }

              return;
            }

            if (
              data.type === "error"
            ) {
              console.error(
                "Backend error:",
                data.message
              );

              setError(
                data.message ||
                  "Detection failed."
              );

              scanningRef.current =
                false;

              processingRef.current =
                false;

              setScanning(false);

              stopCamera();

              return;
            }

            if (
              scanningRef.current
            ) {
              scheduleNextFrame();
            }
          } catch (err) {
            console.error(
              "Unable to parse backend response:",
              err
            );

            processingRef.current =
              false;

            setError(
              "Unable to process the detection response."
            );

            scanningRef.current =
              false;

            setScanning(false);

            stopCamera();
          }
        };

        websocket.onerror = (
          event
        ) => {
          console.error(
            "WebSocket error:",
            event
          );

          processingRef.current =
            false;

          setWebsocketConnected(
            false
          );

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

          setWebsocketConnected(
            false
          );

          processingRef.current =
            false;

          if (
            scanningRef.current
          ) {
            scanningRef.current =
              false;

            setScanning(false);
            setCameraActive(
              false
            );

            if (
              !detectionResult
            ) {
              setError(
                "The detection connection was closed before a wagon could be verified."
              );
            }

            cleanupCamera();
          }
        };
      }
    );
  };

  const startCamera = async () => {
    if (!activeRecord?.id) {
      setError(
        "Please start a railway inspection first."
      );

      return;
    }

    try {
      setError("");

      setResultVisible(false);
      setDetectionResult(null);

      scanningRef.current = false;
      processingRef.current = false;

      cleanupCamera();
      cleanupWebSocket();

      await connectWebSocket();

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode:
                "environment",

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

      streamRef.current =
        stream;

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

            setCameraActive(
              true
            );

            setScanning(true);

            scanningRef.current =
              true;

            processingRef.current =
              false;

            sendFrame();
          } catch (err) {
            console.error(
              "Unable to start video:",
              err
            );

            setError(
              "Unable to start camera video."
            );

            scanningRef.current =
              false;

            processingRef.current =
              false;

            setScanning(false);
            setCameraActive(false);

            cleanupCamera();
            cleanupWebSocket();
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

      scanningRef.current =
        false;

      processingRef.current =
        false;

      setScanning(false);
      setCameraActive(false);
      setWebsocketConnected(
        false
      );

      cleanupCamera();
      cleanupWebSocket();
    }
  };

  const closeResult = () => {
    setResultVisible(false);
    setDetectionResult(null);
  };

  const scanAnotherWagon = async () => {
    setError("");

    closeResult();

    stopCamera();

    setTimeout(() => {
      startCamera();
    }, 150);
  };

  const deleteScannedWagon = (
    localId
  ) => {
    setScannedWagons(
      (current) =>
        current.filter(
          (wagon) =>
            wagon.local_id !==
            localId
        )
    );

    setError("");
  };

  const moveWagonUp = (
    index
  ) => {
    if (index <= 0) {
      return;
    }

    setScannedWagons(
      (current) => {
        const updated = [
          ...current,
        ];

        [
          updated[index - 1],
          updated[index],
        ] = [
          updated[index],
          updated[index - 1],
        ];

        return updated;
      }
    );
  };

  const moveWagonDown = (
    index
  ) => {
    setScannedWagons(
      (current) => {
        if (
          index >=
          current.length - 1
        ) {
          return current;
        }

        const updated = [
          ...current,
        ];

        [
          updated[index],
          updated[index + 1],
        ] = [
          updated[index + 1],
          updated[index],
        ];

        return updated;
      }
    );
  };

  const reorderWagons = (
    reorderedWagons
  ) => {
    setScannedWagons(
      reorderedWagons
    );

    setError("");
  };

  const updateScannedWagon = (
    localId,
    updatedData
  ) => {
    setScannedWagons(
      (current) =>
        current.map(
          (wagon) =>
            wagon.local_id ===
            localId
              ? {
                  ...wagon,
                  ...updatedData,
                }
              : wagon
        )
    );

    setError("");
  };

  const saveWagons = async () => {
    if (!activeRecord?.id) {
      setError(
        "No active railway inspection found."
      );

      return;
    }

    if (!scannedWagons.length) {
      setError(
        "There are no wagons to save."
      );

      return;
    }

    const invalidWagon =
      scannedWagons.find(
        (wagon) =>
          !wagon.wagon_no ||
          wagon.wagon_no
            .trim()
            .length !== 11 ||
          !/^\d{11}$/.test(
            wagon.wagon_no.trim()
          )
      );

    if (invalidWagon) {
      setError(
        `Invalid wagon number: ${
          invalidWagon.wagon_no ||
          "empty"
        }. Wagon numbers must contain exactly 11 digits.`
      );

      return;
    }

    const wagonNumbers =
      scannedWagons.map(
        (wagon) =>
          wagon.wagon_no.trim()
      );

    const hasDuplicateNumbers =
      wagonNumbers.some(
        (number, index) =>
          wagonNumbers.indexOf(
            number
          ) !== index
      );

    if (hasDuplicateNumbers) {
      setError(
        "Duplicate wagon numbers are not allowed."
      );

      return;
    }

    try {
      setSavingWagons(true);
      setError("");

      const response =
        await fetch(
          `${API_URL}/api/railway-records/${activeRecord.id}/wagons/bulk`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              wagons:
                scannedWagons.map(
                  (wagon) => ({
                    wagon_no:
                      wagon.wagon_no
                        .trim(),

                    wagon_type:
                      wagon.wagon_type
                        ?.trim() ||
                      null,

                    wagon_owning:
                      wagon.wagon_owning
                        ?.trim() ||
                      null,

                    gross:
                      wagon.gross
                        ?.trim() ||
                      null,

                    tare:
                      wagon.tare
                        ?.trim() ||
                      null,

                    load:
                      wagon.load
                        ?.trim() ||
                      null,

                    other:
                      wagon.other
                        ?.trim() ||
                      null,
                  })
                ),
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to save wagons."
        );
      }

      localStorage.removeItem(
        getDraftStorageKey(
          activeRecord.id
        )
      );

      setScannedWagons([]);

      setError("");

      console.log(
        "Wagons saved successfully:",
        data
      );
    } catch (err) {
      console.error(
        "Save wagons error:",
        err
      );

      setError(
        err.message ||
          "Unable to save wagons."
      );
    } finally {
      setSavingWagons(false);
    }
  };

  const finishInspection =
    async () => {
      if (!activeRecord?.id) {
        return;
      }

      if (scannedWagons.length > 0) {
        setError(
          "Please save all scanned wagons before finishing the inspection."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Finish inspection for R-No ${activeRecord.r_no}?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setError("");

        stopCamera();

        const response =
          await fetch(
            `${API_URL}/api/railway-records/${activeRecord.id}/line-out`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => null
            );

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "Unable to finish inspection."
          );
        }

        localStorage.removeItem(
          getDraftStorageKey(
            activeRecord.id
          )
        );

        setActiveRecord(null);
        setInspectionStarted(
          false
        );

        setScannedWagons([]);

        setDetectionResult(
          null
        );

        setResultVisible(
          false
        );

        setScanning(false);
        setCameraActive(false);
        setWebsocketConnected(
          false
        );

        setError("");
      } catch (err) {
        console.error(
          "Finish inspection error:",
          err
        );

        setError(
          err.message ||
            "Unable to finish inspection."
        );
      }
    };

  useEffect(() => {
    loadActiveRecord();

    return () => {
      scanningRef.current =
        false;

      processingRef.current =
        false;

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

  const formatDateTime = (
    value
  ) => {
    if (!value) {
      return "--";
    }

    const date = new Date(
      value
    );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  };

  if (recordLoading) {
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

          <div className="camera-status inactive">
            <span className="status-dot"></span>

            Camera Inactive
          </div>
        </header>

        <main className="main-container">
          <div className="loading-container">
            Loading railway inspection...
          </div>
        </main>
      </div>
    );
  }

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

      {!inspectionStarted ? (
        <main className="record-page">
          <RailwayRecordForm
            onRecordCreated={
              handleRecordCreated
            }
          />

          {error && (
            <div className="global-error">
              {error}
            </div>
          )}
        </main>
      ) : (
        <main className="inspection-page">
          <section className="record-summary">
            <div className="record-summary-content">
              <div className="record-summary-item">
                <span>R-NO</span>

                <strong>
                  {activeRecord?.r_no ||
                    "--"}
                </strong>
              </div>

              <div className="record-summary-item">
                <span>LINE IN</span>

                <strong>
                  {formatDateTime(
                    activeRecord?.line_in
                  )}
                </strong>
              </div>

              <div className="record-summary-status">
                <span className="status-dot"></span>

                <span>
                  Inspection Active
                </span>
              </div>

              <button
                type="button"
                className="finish-inspection-button"
                onClick={
                  finishInspection
                }
                disabled={
                  savingWagons ||
                  scanning
                }
              >
                Finish Inspection
              </button>
            </div>
          </section>

          {error && (
            <div className="global-error">
              {error}
            </div>
          )}

          <div className="main-container">
            <CameraPanel
              videoRef={
                videoRef
              }
              canvasRef={
                canvasRef
              }
              cameraActive={
                cameraActive
              }
              websocketConnected={
                websocketConnected
              }
              scanning={
                scanning
              }
              error={error}
              startCamera={
                startCamera
              }
              stopCamera={() => {
                stopCamera();

                setDetectionResult(
                  null
                );

                setResultVisible(
                  false
                );
              }}
              isVerified={
                resultVisible &&
                detectionResult
                  ?.validation
                  ?.valid === true
              }
            />

            <ResultPanel
              detectionResult={
                detectionResult
              }
              resultVisible={
                resultVisible
              }
              closeResult={
                closeResult
              }
              scanAnotherWagon={
                scanAnotherWagon
              }
            />
          </div>

          <ScannedWagons
            wagons={
              scannedWagons
            }
            onDelete={
              deleteScannedWagon
            }
            onMoveUp={
              moveWagonUp
            }
            onMoveDown={
              moveWagonDown
            }
            onReorder={
              reorderWagons
            }
            onUpdate={
              updateScannedWagon
            }
            onSave={
              saveWagons
            }
            saving={
              savingWagons
            }
          />
        </main>
      )}
    </div>
  );
}

export default App;