from fastapi import APIRouter
from src.schemas.response.analytics import AnalyticsOverviewResponse
from src.schemas.response.generic import ApiResponse
from src.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=ApiResponse[AnalyticsOverviewResponse])
async def get_analytics_overview():
    """
    Get aggregated analytics overview data.
    
    This endpoint unifies data across alerts, incidents, workers, permits, sensors, 
    and computer vision detections into a single response object for the Analytics Dashboard.
    """
    overview_data = await AnalyticsService.get_overview()
    return ApiResponse(
        data=overview_data,
        message="Analytics overview fetched successfully",
        success=True
    )
