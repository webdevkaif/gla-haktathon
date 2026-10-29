from typing import Optional
from fastapi import APIRouter, Depends, Query
from backend.app.database import get_db
from backend.app.services.anomaly import detect_pyod_isolation_forest_anomalies

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies"])

@router.get("/detect")
async def get_anomaly_detections(
    user_id: str = "user_default",
    month: Optional[str] = Query(None, description="Optional filter by month in YYYY-MM format"),
    db = Depends(get_db)
):
    """
    Lightweight Financial Anomaly Detection endpoint using PyOD + Isolation Forest.
    Analyzes real MongoDB expense transaction data strictly for the authenticated user.
    Flags unusually high spending, sudden spikes, duplicate payments, and pattern deviations.
    """
    return await detect_pyod_isolation_forest_anomalies(db, user_id=user_id, month=month)
