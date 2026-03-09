from pydantic import BaseModel
from typing import List, Optional


class DetectionResultItem(BaseModel):
    label: str
    score: float


class DetectionResponse(BaseModel):
    ok: bool
    results: List[DetectionResultItem]
    topLabel: Optional[str] = None
    topScore: Optional[float] = None
    error: Optional[str] = None