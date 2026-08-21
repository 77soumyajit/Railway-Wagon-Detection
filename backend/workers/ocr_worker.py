import base64
import json
import sys

import cv2
import numpy as np
from paddleocr import PaddleOCR


def log(message):
    """
    Send logs to stderr.

    stdout is reserved exclusively for JSON responses.
    """
    print(message, file=sys.stderr, flush=True)


log("Starting OCR worker...")

ocr = PaddleOCR(
    lang="en"
)

log("PaddleOCR loaded in OCR worker")
log("OCR worker ready")


def process_request(request):
    """
    Process one OCR request.

    Expected request:

    {
        "image": "<base64 jpeg>"
    }

    Returns:

    {
        "success": true,
        "wagon_number": "...",
        "raw_text": "...",
        "confidence": 0.99
    }
    """

    image_base64 = request.get("image")

    if not image_base64:
        return {
            "success": False,
            "message": "No image provided",
        }

    try:

        # --------------------------------------------------
        # Decode base64
        # --------------------------------------------------

        image_bytes = base64.b64decode(
            image_base64
        )

        # --------------------------------------------------
        # Convert to numpy
        # --------------------------------------------------

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        # --------------------------------------------------
        # Decode image
        # --------------------------------------------------

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if image is None:
            return {
                "success": False,
                "message": "Could not decode image",
            }

        # Make sure PaddleOCR receives a contiguous array.
        image = np.ascontiguousarray(image)

        log(
            f"OCR request received: "
            f"{image.shape}"
        )

        # --------------------------------------------------
        # Run PaddleOCR
        # --------------------------------------------------

        result = ocr.predict(image)

        if not result:
            return {
                "success": False,
                "message": "OCR returned no result",
            }

        page = result[0]

        texts = page.get(
            "rec_texts",
            [],
        )

        scores = page.get(
            "rec_scores",
            [],
        )

        log(
            f"OCR detected texts: {texts}"
        )

        if not texts:
            return {
                "success": False,
                "message": "No text detected",
            }

        # --------------------------------------------------
        # Clean OCR results
        # --------------------------------------------------

        cleaned_texts = []

        for text in texts:

            if not text:
                continue

            text = str(text).strip()

            if not text:
                continue

            cleaned_texts.append(text)

        if not cleaned_texts:
            return {
                "success": False,
                "message": "No usable text detected",
            }

        # --------------------------------------------------
        # Combine text
        # --------------------------------------------------

        raw_text = " ".join(
            cleaned_texts
        )

        # Keep only alphanumeric characters.
        wagon_number = "".join(
            character
            for character in raw_text
            if character.isalnum()
        )

        # --------------------------------------------------
        # Confidence
        # --------------------------------------------------

        numeric_scores = []

        for score in scores:

            try:
                numeric_scores.append(
                    float(score)
                )
            except (
                TypeError,
                ValueError,
            ):
                pass

        if numeric_scores:
            confidence = sum(
                numeric_scores
            ) / len(numeric_scores)
        else:
            confidence = 0.0

        log(
            f"Wagon number OCR: "
            f"{wagon_number} "
            f"confidence={confidence:.3f}"
        )

        return {
            "success": True,
            "wagon_number": wagon_number,
            "raw_text": raw_text,
            "confidence": confidence,
        }

    except Exception as exc:

        log(
            f"OCR processing error: {exc}"
        )

        return {
            "success": False,
            "message": str(exc),
        }


def main():

    log("OCR worker waiting for requests...")

    for line in sys.stdin:

        line = line.strip()

        if not line:
            continue

        try:

            request = json.loads(line)

            response = process_request(
                request
            )

        except json.JSONDecodeError as exc:

            response = {
                "success": False,
                "message": (
                    f"Invalid JSON: {exc}"
                ),
            }

        except Exception as exc:

            response = {
                "success": False,
                "message": str(exc),
            }

        # --------------------------------------------------
        # IMPORTANT
        #
        # stdout contains ONLY JSON.
        # --------------------------------------------------

        print(
            json.dumps(response),
            flush=True,
        )


if __name__ == "__main__":
    main()