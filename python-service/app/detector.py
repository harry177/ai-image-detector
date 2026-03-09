from transformers import pipeline
from PIL import Image
from typing import BinaryIO

MODEL_ID = "umm-maybe/AI-image-detector"

_detector = None


def get_detector():
    global _detector

    if _detector is None:
        print("Loading detector model...")
        _detector = pipeline(
            "image-classification",
            model=MODEL_ID
        )
        print("Detector model loaded.")

    return _detector


def detect_image(file_obj: BinaryIO):
    detector = get_detector()

    image = Image.open(file_obj).convert("RGB")
    result = detector(image)

    normalized = sorted(
        [
            {
                "label": item["label"],
                "score": float(item["score"]),
            }
            for item in result
        ],
        key=lambda x: x["score"],
        reverse=True,
    )

    return normalized