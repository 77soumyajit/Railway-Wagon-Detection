from typing import Optional

import numpy as np

from app.services.yolo_service import yolo_service
from app.services.ocr_service import ocr_service
from app.services.wagon_validator import wagon_validator


def detect_wagon_number(
    frame: np.ndarray,
) -> Optional[dict]:
    """
    Complete wagon-number detection pipeline.

    Pipeline:

        Frame
          ↓
        YOLO
          ↓
        UIC crop
          ↓
        OCR
          ↓
        Wagon number validation

    Returns:
        {
            "bbox": {...},
            "confidence": float,
            "class_id": int,
            "class_name": str,
            "crop": numpy.ndarray,

            "ocr": {
                "success": bool,
                "wagon_number": str | None,
                "raw_text": str | None,
                "confidence": float
            },

            "validation": {
                ...
            }
        }

    Returns None when YOLO cannot find a UIC region.
    """

    # =====================================================
    # 1. YOLO DETECTION
    # =====================================================

    detection = yolo_service.detect(
        frame,
        confidence=0.50,
    )

    if detection is None:
        return None

    bbox = detection["bbox"]

    # =====================================================
    # 2. BASIC DETECTION RESULT
    # =====================================================

    result = {
        "bbox": {
            "x1": int(bbox["x1"]),
            "y1": int(bbox["y1"]),
            "x2": int(bbox["x2"]),
            "y2": int(bbox["y2"]),
        },

        "confidence": float(
            detection["confidence"]
        ),

        "class_id": int(
            detection["class_id"]
        ),

        "class_name": str(
            detection["class_name"]
        ),

        "crop": detection["crop"],

        "ocr": {
            "success": False,
            "wagon_number": None,
            "raw_text": None,
            "confidence": 0.0,
        },

        "validation": None,
    }

    # =====================================================
    # 3. GET YOLO CROP
    # =====================================================

    crop = detection.get("crop")

    if crop is None or crop.size == 0:
        return result

    # =====================================================
    # 4. OCR
    # =====================================================

    try:

        print("Sending detected region to OCR...")

        ocr_result = (
            ocr_service.extract_wagon_number(
                crop
            )
        )

    except Exception as exc:

        print(
            "OCR error:",
            exc,
        )

        return result

    # =====================================================
    # 5. NO OCR RESULT
    # =====================================================

    if ocr_result is None:

        print(
            "OCR did not detect any text"
        )

        return result

    # =====================================================
    # 6. EXTRACT OCR RESULT
    # =====================================================

    wagon_number = ocr_result.get(
        "wagon_number"
    )

    raw_text = ocr_result.get(
        "raw_text"
    )

    ocr_confidence = float(
        ocr_result.get(
            "confidence",
            0.0,
        )
    )

    result["ocr"] = {
        "success": bool(wagon_number),

        "wagon_number": (
            str(wagon_number)
            if wagon_number
            else None
        ),

        "raw_text": (
            str(raw_text)
            if raw_text
            else None
        ),

        "confidence": ocr_confidence,
    }

    print(
        "Wagon number OCR:",
        wagon_number,
        f"confidence={ocr_confidence:.3f}",
    )

    # =====================================================
    # 7. VALIDATE WAGON NUMBER
    # =====================================================

    if not wagon_number:

        return result

    try:

        validation_result = (
            wagon_validator.validate(
                wagon_number
            )
        )

        result["validation"] = (
            validation_result
        )

        print(
            "Wagon validation:",
            validation_result["valid"],
        )

        print(
            "Actual check digit:",
            validation_result[
                "check_digit"
            ]["actual"],
        )

        print(
            "Calculated check digit:",
            validation_result[
                "check_digit"
            ]["calculated"],
        )

    except Exception as exc:

        print(
            "Wagon validation error:",
            exc,
        )

    return result