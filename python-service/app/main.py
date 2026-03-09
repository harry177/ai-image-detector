from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.detector import detect_image, extract_scores
from app.schemas import DetectionResponse

app = FastAPI(title="AI Image Detector Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/detect", response_model=DetectionResponse)
async def detect(image: UploadFile = File(...)):
    try:
        if not image.content_type or not image.content_type.startswith("image/"):
            return DetectionResponse(
                ok=False,
                results=[],
                error="Uploaded file must be an image"
            )

        results = detect_image(image.file)
        ai_score, real_score = extract_scores(results)

        return DetectionResponse(
            ok=True,
            results=results,
            topLabel=results[0]["label"] if results else None,
            topScore=results[0]["score"] if results else None,
            aiScore=ai_score,
            realScore=real_score,
        )
    except Exception as error:
        print("Detection error:", error)

        return DetectionResponse(
            ok=False,
            results=[],
            error="Failed to analyze image"
        )