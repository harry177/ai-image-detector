from transformers import pipeline
from PIL import Image
from typing import BinaryIO, Optional

MODEL_ID = "Organika/sdxl-detector"

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
                "label": str(item["label"]),
                "score": float(item["score"]),
            }
            for item in result
        ],
        key=lambda x: x["score"],
        reverse=True,
    )

    return normalized


def find_score_by_label(results, keywords) -> Optional[float]:
    for item in results:
        label = item["label"].strip().lower()
        if any(keyword == label or keyword in label for keyword in keywords):
            return float(item["score"])
    return None


def extract_scores(results):
    if not results:
        return None, None

    ai_score = find_score_by_label(
        results,
        [
            "artificial",
            "ai-generated",
            "ai generated",
            "generated",
            "synthetic",
            "fake",
            "ai",
            "sdxl",
        ]
    )

    real_score = find_score_by_label(
        results,
        [
            "human",
            "real",
            "photo",
            "photograph",
            "natural",
            "non-sdxl",
            "not ai",
        ]
    )

    if ai_score is None and real_score is not None:
        ai_score = 1.0 - real_score

    if real_score is None and ai_score is not None:
        real_score = 1.0 - ai_score

    return ai_score, real_score