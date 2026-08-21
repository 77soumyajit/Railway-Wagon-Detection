from pathlib import Path
from typing import Optional

import numpy as np
from ultralytics import YOLO


class YOLOService:
    """
    YOLO service responsible for detecting the wagon number region.

    Class mapping from the trained model:
        0 -> WAgon-uic
        1 -> uic

    We only use class 1 (uic) because it represents
    the actual wagon number region.
    """

    UIC_CLASS_ID = 1

    def __init__(self):
        base_dir = Path(__file__).resolve().parents[2]

        self.model_path = (
            base_dir
            / "models"
            / "wagon_number"
            / "best.pt"
        )

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"YOLO model not found: {self.model_path}"
            )

        print(
            f"Loading wagon YOLO model: "
            f"{self.model_path}"
        )

        self.model = YOLO(str(self.model_path))

        print("Wagon YOLO model loaded successfully")

    def detect(
        self,
        frame: np.ndarray,
        confidence: float = 0.50,
    ) -> Optional[dict]:
        """
        Detect the wagon-number region.

        Returns:
            {
                "bbox": {
                    "x1": ...,
                    "y1": ...,
                    "x2": ...,
                    "y2": ...
                },
                "confidence": ...,
                "class_id": 1,
                "class_name": "uic",
                "crop": numpy.ndarray
            }

        Returns None when no UIC region is detected.
        """

        if frame is None:
            return None

        # Make sure the input frame is contiguous.
        # This is important when the image is passed
        # between OpenCV, NumPy and PaddleOCR.
        frame = np.ascontiguousarray(frame)

        # --------------------------------------------------
        # Run YOLO
        # --------------------------------------------------

        results = self.model.predict(
            source=frame,
            conf=confidence,
            verbose=False,
        )

        if not results:
            return None

        result = results[0]

        if result.boxes is None or len(result.boxes) == 0:
            return None

        # --------------------------------------------------
        # Find the best UIC detection
        # --------------------------------------------------

        best_detection = None
        best_confidence = 0.0

        for box in result.boxes:

            class_id = int(
                box.cls[0].item()
            )

            box_confidence = float(
                box.conf[0].item()
            )

            # We only want class 1 -> uic.
            if class_id != self.UIC_CLASS_ID:
                continue

            if box_confidence < best_confidence:
                continue

            coordinates = (
                box.xyxy[0]
                .cpu()
                .numpy()
            )

            x1, y1, x2, y2 = (
                coordinates.astype(int)
            )

            best_detection = {
                "x1": int(x1),
                "y1": int(y1),
                "x2": int(x2),
                "y2": int(y2),
                "confidence": box_confidence,
                "class_id": class_id,
                "class_name": "uic",
            }

            best_confidence = box_confidence

        if best_detection is None:
            return None

        # --------------------------------------------------
        # Keep coordinates inside the image
        # --------------------------------------------------

        height, width = frame.shape[:2]

        x1 = max(
            0,
            min(
                best_detection["x1"],
                width - 1,
            ),
        )

        y1 = max(
            0,
            min(
                best_detection["y1"],
                height - 1,
            ),
        )

        x2 = max(
            0,
            min(
                best_detection["x2"],
                width,
            ),
        )

        y2 = max(
            0,
            min(
                best_detection["y2"],
                height,
            ),
        )

        if x2 <= x1 or y2 <= y1:
            return None

        # --------------------------------------------------
        # Add padding around detected number
        # --------------------------------------------------

        box_width = x2 - x1
        box_height = y2 - y1

        padding_x = int(
            box_width * 0.10
        )

        padding_y = int(
            box_height * 0.15
        )

        crop_x1 = max(
            0,
            x1 - padding_x,
        )

        crop_y1 = max(
            0,
            y1 - padding_y,
        )

        crop_x2 = min(
            width,
            x2 + padding_x,
        )

        crop_y2 = min(
            height,
            y2 + padding_y,
        )

        # --------------------------------------------------
        # Crop image
        # --------------------------------------------------

        crop = frame[
            crop_y1:crop_y2,
            crop_x1:crop_x2,
        ]

        if crop.size == 0:
            return None

        # --------------------------------------------------
        # IMPORTANT:
        # NumPy slicing can create a non-contiguous array.
        #
        # PaddleOCR/Paddle can fail with:
        #
        # "Tensor holds no memory"
        #
        # Make an independent contiguous copy.
        # --------------------------------------------------

        crop = np.ascontiguousarray(
            crop
        )

        # Extra safety: ensure uint8.
        if crop.dtype != np.uint8:
            crop = crop.astype(
                np.uint8,
                copy=False,
            )

        return {
            "bbox": {
                "x1": int(crop_x1),
                "y1": int(crop_y1),
                "x2": int(crop_x2),
                "y2": int(crop_y2),
            },
            "confidence": float(
                best_detection["confidence"]
            ),
            "class_id": int(
                best_detection["class_id"]
            ),
            "class_name": str(
                best_detection["class_name"]
            ),
            "crop": crop,
        }


# Load the model once when the application starts.
yolo_service = YOLOService()