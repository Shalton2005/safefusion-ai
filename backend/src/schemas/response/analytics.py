from typing import List, Optional, Union
from pydantic import BaseModel, Field

class MetricData(BaseModel):
    value: Union[str, float, int]
    change: str
    trendDir: str
    positive: bool

class TimeSeriesPoint(BaseModel):
    timestamp: str
    value: Optional[float] = None
    forecastValue: Optional[float] = None
    critical: Optional[int] = None
    resolved: Optional[int] = None
    confidence: Optional[str] = None
    isForecast: Optional[bool] = False

class RiskZoneData(BaseModel):
    zone: str
    riskPercentage: float
    activeIncidents: int
    criticalIncidents: int
    trend: str

class TimelineEvent(BaseModel):
    time: str
    title: str
    severity: str
    confidence: str
    reason: str
    action: str

class AIRecommendation(BaseModel):
    priority: int
    title: str
    confidence: str
    impact: str
    eta: str
    status: str

class AISummary(BaseModel):
    increase_percentage: int
    primary_contributors: List[str]
    predicted_impact: str
    recommended_actions: List[str]

# Map Overlay Data Types
class FacilityZone(BaseModel):
    id: str
    name: str
    x: float
    y: float
    width: float
    height: float
    color: str
    opacity: Optional[float] = 1.0

class MapIncident(BaseModel):
    id: str
    x: float
    y: float
    severity: str
    zone: str
    description: str
    occurred_at: str
    incident_type: str
class DangerZone(BaseModel):
    id: str
    center: List[float]
    radius: float
    color: str
    zone: str
    incidentCount: int
    highestRisk: str
    confidence: str

class RestrictedZone(BaseModel):
    id: str
    center: List[float]
    radius: float
    color: str
    zone: str
    incidentCount: int
    highestRisk: str
    confidence: str

class MapWorker(BaseModel):
    id: str
    pos: List[float]
    name: str

class MapPermit(BaseModel):
    id: str
    pos: List[float]
    label: str

class MapCamera(BaseModel):
    id: str
    pos: List[float]
    label: str

class MapGasSensor(BaseModel):
    id: str
    pos: List[float]
    label: str

class MapOverlays(BaseModel):
    danger_zones: List[DangerZone]
    restricted_zones: List[RestrictedZone]
    evacuation_path: List[List[float]]
    workers: List[MapWorker]
    permits: List[MapPermit]
    cameras: List[MapCamera]
    gas_sensors: List[MapGasSensor]
    facility_zones: List[FacilityZone]
    incidents: List[MapIncident]

class AnalyticsOverviewResponse(BaseModel):
    plant_status: str
    aiSummary: AISummary
    aiRecommendations: List[AIRecommendation]
    predictiveTimeline: List[TimelineEvent]
    mapOverlays: MapOverlays
