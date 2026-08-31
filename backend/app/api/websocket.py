import base64

import cv2
import numpy as np

from fastapi import APIRouter
from fastapi import WebSocket
from fastapi import WebSocketDisconnect

from app.database.database import get_db
from app.database.crud import get_railway_record

from app.services.detection_service import (
    detect_wagon_number,
)
from app.services.wagon_metadata_service import (
    get_wagon_metadata,
)


router = APIRouter()


@router.websocket("/ws/wagon-detection")
async def wagon_detection_websocket(
    websocket: WebSocket,
):
    record_id = websocket.query_params.get(
        "record_id"
    )

    if not record_id:
        await websocket.close(
            code=1008,
            reason="Railway record ID is required",
        )
        return

    try:
        record_id = int(record_id)
    except ValueError:
        await websocket.close(
            code=1008,
            reason="Invalid railway record ID",
        )
        return

    db = next(get_db())

    try:
        railway_record = get_railway_record(
            db,
            record_id,
        )

        if railway_record is None:
            await websocket.close(
                code=1008,
                reason="Railway record not found",
            )
            return

        if railway_record.line_out is not None:
            await websocket.close(
                code=1008,
                reason="Railway inspection already finished",
            )
            return

        await websocket.accept()

        print(
            f"Wagon detection client connected "
            f"for railway record {record_id}"
        )

        while True:
            frame_data = await websocket.receive_text()

            if "," in frame_data:
                frame_data = frame_data.split(
                    ",",
                    1,
                )[1]

            try:
                image_bytes = base64.b64decode(
                    frame_data
                )
            except Exception:
                await websocket.send_json(
                    {
                        "success": False,
                        "type": "error",
                        "message": "Invalid camera frame",
                    }
                )
                continue

            image_array = np.frombuffer(
                image_bytes,
                dtype=np.uint8,
            )

            frame = cv2.imdecode(
                image_array,
                cv2.IMREAD_COLOR,
            )

            if frame is None:
                await websocket.send_json(
                    {
                        "success": False,
                        "type": "error",
                        "message": "Unable to decode camera frame",
                    }
                )
                continue

            height, width = frame.shape[:2]

            try:
                detection = detect_wagon_number(
                    frame
                )

            except Exception as exc:
                print(
                    "Detection pipeline error:",
                    exc,
                )

                await websocket.send_json(
                    {
                        "success": False,
                        "type": "error",
                        "message": "Detection pipeline failed",
                        "frame": {
                            "width": width,
                            "height": height,
                        },
                    }
                )
                continue

            if detection is None:
                await websocket.send_json(
                    {
                        "success": True,
                        "type": "no_detection",
                        "message": "Wagon number not detected",
                        "frame": {
                            "width": width,
                            "height": height,
                        },
                    }
                )
                continue

            bbox = detection["bbox"]

            detection_confidence = float(
                detection["confidence"]
            )

            class_id = int(
                detection["class_id"]
            )

            class_name = str(
                detection["class_name"]
            )

            ocr = detection.get("ocr")

            if ocr is None:
                ocr = {
                    "success": False,
                    "wagon_number": None,
                    "raw_text": None,
                    "confidence": 0.0,
                }

            validation = detection.get(
                "validation"
            )

            wagon_number = ocr.get(
                "wagon_number"
            )

            metadata = None

            if (
                wagon_number
                and len(str(wagon_number)) == 11
            ):
                metadata = get_wagon_metadata(
                    str(wagon_number)
                )

            is_verified = bool(
                wagon_number
                and len(str(wagon_number)) == 11
                and validation
                and validation.get("valid") is True
                and metadata is not None
            )

            if wagon_number:
                print(
                    "Final wagon result:",
                    wagon_number,
                )

                print(
                    "OCR confidence:",
                    f"{float(ocr.get('confidence', 0.0)):.3f}",
                )

                if validation:
                    print(
                        "Wagon validation:",
                        (
                            "VALID"
                            if validation.get("valid")
                            else "INVALID"
                        ),
                    )

                    print(
                        "Actual check digit:",
                        validation.get(
                            "check_digit",
                            {},
                        ).get("actual"),
                    )

                    print(
                        "Calculated check digit:",
                        validation.get(
                            "check_digit",
                            {},
                        ).get("calculated"),
                    )

                print(
                    "Verification:",
                    (
                        "VERIFIED"
                        if is_verified
                        else "NOT VERIFIED"
                    ),
                )

            response = {
                "success": True,
                "type": "wagon_detected",
                "message": (
                    "Wagon number verified successfully"
                    if is_verified
                    else "Wagon number processed"
                ),
                "verified": is_verified,

                "detection": {
                    "confidence": round(
                        detection_confidence,
                        4,
                    ),
                    "bbox": {
                        "x1": int(bbox["x1"]),
                        "y1": int(bbox["y1"]),
                        "x2": int(bbox["x2"]),
                        "y2": int(bbox["y2"]),
                    },
                    "class_id": class_id,
                    "class_name": class_name,
                },

                "ocr": {
                    "success": bool(
                        ocr.get(
                            "success",
                            False,
                        )
                    ),
                    "wagon_number": (
                        str(wagon_number)
                        if wagon_number
                        else None
                    ),
                    "raw_text": (
                        str(
                            ocr.get(
                                "raw_text"
                            )
                        )
                        if ocr.get(
                            "raw_text"
                        )
                        else None
                    ),
                    "confidence": round(
                        float(
                            ocr.get(
                                "confidence",
                                0.0,
                            )
                        ),
                        4,
                    ),
                },

                "validation": validation,

                "metadata": metadata,

                "frame": {
                    "width": width,
                    "height": height,
                },
            }

            await websocket.send_json(
                response
            )

            if is_verified:
                print("=" * 40)
                print(
                    f"WAGON VERIFIED: {wagon_number}"
                )
                print(
                    "Returning verified wagon to frontend"
                )
                print("=" * 40)

                break

    except WebSocketDisconnect:
        print(
            "Wagon detection WebSocket session ended"
        )

    except Exception as exc:
        print(
            "WebSocket error:",
            exc,
        )

        try:
            await websocket.send_json(
                {
                    "success": False,
                    "type": "error",
                    "message": (
                        "Wagon detection service "
                        "encountered an unexpected error."
                    ),
                }
            )
        except Exception:
            pass

    finally:
        db.close()