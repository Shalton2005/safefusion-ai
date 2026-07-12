"""
Knowledge graph query routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoints exposing the reusable
Neo4j lookups defined in :mod:`src.services.graph_query` under a single
``/graph`` namespace.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from neo4j import Session

from src.graph_database.session import get_graph_session
from src.repositories.graph_query import GraphQueryRepository
from src.schemas.response.graph_query import GraphQueryResponse
from src.services.graph_query import GraphQueryService

router: APIRouter = APIRouter(prefix="/graph", tags=["Knowledge Graph"])

GraphSessionDep = Annotated[Session, Depends(get_graph_session)]


def get_graph_query_service(session: GraphSessionDep) -> GraphQueryService:
    """Create the graph query service with its repository dependency."""
    return GraphQueryService(repository=GraphQueryRepository(session))


GraphQueryServiceDep = Annotated[GraphQueryService, Depends(get_graph_query_service)]


@router.get(
    "/workers",
    summary="List workers",
    description="Returns every worker node in the knowledge graph.",
    response_model=GraphQueryResponse,
    response_description="All workers.",
)
def list_workers(service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.list_workers())


@router.get(
    "/zones",
    summary="List zones",
    description="Returns every zone node in the knowledge graph.",
    response_model=GraphQueryResponse,
    response_description="All zones.",
)
def list_zones(service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.list_zones())


@router.get(
    "/permits",
    summary="List permits",
    description="Returns every permit node in the knowledge graph.",
    response_model=GraphQueryResponse,
    response_description="All permits.",
)
def list_permits(service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.list_permits())


@router.get(
    "/incidents",
    summary="List incidents",
    description="Returns every incident node in the knowledge graph.",
    response_model=GraphQueryResponse,
    response_description="All incidents.",
)
def list_incidents(service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.list_incidents())


@router.get(
    "/risks",
    summary="List risks",
    description="Returns every risk assessment node in the knowledge graph.",
    response_model=GraphQueryResponse,
    response_description="All risks.",
)
def list_risks(service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.list_risks())


@router.get(
    "/zones/{zone_id}/workers",
    summary="Get workers by zone",
    description="Returns every worker currently located in the given zone.",
    response_model=GraphQueryResponse,
    response_description="Workers located in the zone.",
)
def get_workers_by_zone(zone_id: str, service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.workers_by_zone(zone_id))


@router.get(
    "/workers/{worker_id}/permits",
    summary="Get permits by worker",
    description="Returns permits related to the given worker's current zone.",
    response_model=GraphQueryResponse,
    response_description="Permits related to the worker.",
)
def get_permits_by_worker(worker_id: str, service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.permits_by_worker(worker_id))


@router.get(
    "/equipment/{equipment_id}/incidents",
    summary="Get incidents by equipment",
    description="Returns incidents that occurred in the given equipment's zone.",
    response_model=GraphQueryResponse,
    response_description="Incidents affecting the equipment.",
)
def get_incidents_by_equipment(equipment_id: str, service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.incidents_by_equipment(equipment_id))


@router.get(
    "/zones/{zone_id}/sensors",
    summary="Get sensors by zone",
    description="Returns every sensor monitoring the given zone.",
    response_model=GraphQueryResponse,
    response_description="Sensors monitoring the zone.",
)
def get_sensors_by_zone(zone_id: str, service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.sensors_by_zone(zone_id))


@router.get(
    "/incidents/{incident_id}/risks",
    summary="Get risks by incident",
    description="Returns the risk assessment(s) connected to the given incident.",
    response_model=GraphQueryResponse,
    response_description="Risk assessments linked to the incident.",
)
def get_risks_by_incident(incident_id: str, service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.risks_by_incident(incident_id))
