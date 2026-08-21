import base64
import json
import subprocess
from pathlib import Path
from typing import Optional

import cv2
import numpy as np


class OCRService:
    """
    Client for the separate PaddleOCR worker.

    PaddleOCR is intentionally NOT imported here.

    This service communicates with:
        backend/workers/ocr_worker.py

    Keeping PaddleOCR in a separate process prevents
    conflicts between PaddlePaddle and PyTorch/Torchvision.
    """

    def __init__(self):
        backend_dir = Path(__file__).resolve().parents[2]

        worker_path = (
            backend_dir
            / "workers"
            / "ocr_worker.py"
        )

        if not worker_path.exists():
            raise FileNotFoundError(
                f"OCR worker not found: {worker_path}"
            )

        python_path = (
            backend_dir
            / "venv"
            / "bin"
            / "python"
        )

        if not python_path.exists():
            raise FileNotFoundError(
                f"Python executable not found: {python_path}"
            )

        print(
            f"Starting OCR worker: {worker_path}"
        )

        self.process = subprocess.Popen(
            [
                str(python_path),
                str(worker_path),
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=None,
            text=True,
            bufsize=1,
        )

        print("OCR worker started successfully")

    def extract_wagon_number(
        self,
        image: np.ndarray,
    ) -> Optional[dict]:
        """
        Send an image crop to the OCR worker.

        Returns:

            {
                "wagon_number": "22142322536",
                "raw_text": "221423 22536",
                "confidence": 0.9998
            }

        or None when OCR fails.
        """

        if image is None:
            return None

        if self.process.poll() is not None:
            print("OCR worker is not running")
            return None

        # Make sure the image is contiguous.
        image = np.ascontiguousarray(image)

        success, encoded = cv2.imencode(
            ".jpg",
            image,
        )

        if not success:
            print("Failed to encode OCR image")
            return None

        image_base64 = base64.b64encode(
            encoded.tobytes()
        ).decode("utf-8")

        request = {
            "image": image_base64,
        }

        try:

            # Send request to worker.
            self.process.stdin.write(
                json.dumps(request) + "\n"
            )

            self.process.stdin.flush()

            # Wait for response.
            response_line = (
                self.process.stdout.readline()
            )

            if not response_line:
                print(
                    "OCR worker returned no response"
                )
                return None

            response = json.loads(
                response_line
            )

            if not response.get("success"):
                print(
                    "OCR failed:",
                    response.get("message"),
                )

                return None

            return {
                "wagon_number": str(
                    response["wagon_number"]
                ),
                "raw_text": str(
                    response.get(
                        "raw_text",
                        "",
                    )
                ),
                "confidence": float(
                    response.get(
                        "confidence",
                        0.0,
                    )
                ),
            }

        except Exception as exc:

            print(
                "OCR service error:",
                exc,
            )

            return None


ocr_service = OCRService()