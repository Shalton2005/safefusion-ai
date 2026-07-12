"""
Knowledge graph query routes for SafeFusion AI API v1.

Thin Route -> Service -> Repository endpoints exposing the reusable
Neo4j lookups defined in :mod:`src.services.graph_query` under a single
``/graph`` namespace.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from neo4j import Session

from src.graph_database.session import get_graph_session
from src.repositories.graph_query import GraphQueryRepository
from src.repositories.graph_visualization import GraphVisualizationRepository
from src.schemas.response.graph_query import GraphQueryResponse
from src.schemas.response.graph_visualization import GraphVisualizationResponse
from src.services.graph_query import GraphQueryService
from src.services.graph_visualization import GraphVisualizationService

router: APIRouter = APIRouter(prefix="/graph", tags=["Knowledge Graph"])

GraphSessionDep = Annotated[Session, Depends(get_graph_session)]


def get_graph_query_service(session: GraphSessionDep) -> GraphQueryService:
    """Create the graph query service with its repository dependency."""
    return GraphQueryService(repository=GraphQueryRepository(session))


def get_graph_visualization_service(session: GraphSessionDep) -> GraphVisualizationService:
    """Create the graph visualization service with its repository dependency."""
    return GraphVisualizationService(repository=GraphVisualizationRepository(session))


GraphQueryServiceDep = Annotated[GraphQueryService, Depends(get_graph_query_service)]
GraphVisualizationServiceDep = Annotated[
    GraphVisualizationService, Depends(get_graph_visualization_service)
]


@router.get(
    "/visualization",
    summary="Get full graph visualization data",
    description=(
        "Returns the entire knowledge graph as nodes, relationships, and "
        "summary metadata, in a frontend-friendly JSON format for graph-"
        "rendering libraries. The backend performs no rendering or layout — "
        "positioning and drawing are entirely a frontend concern."
    ),
    response_model=GraphVisualizationResponse,
    response_description="Nodes, relationships, and metadata for the full knowledge graph.",
)
def get_graph_visualization(
    service: GraphVisualizationServiceDep,
    node_limit: int = Query(1_000, ge=1, le=10_000, description="Maximum number of nodes to return."),
    relationship_limit: int = Query(
        5_000, ge=1, le=50_000, description="Maximum number of relationships to return."
    ),
) -> GraphVisualizationResponse:
    data = service.get_visualization_data(node_limit=node_limit, relationship_limit=relationship_limit)
    return GraphVisualizationResponse.model_validate(data)


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
    description=(
        "Returns permits related to the given worker's current zone. "
        "APPROXIMATION: returns every permit in the worker's zone, not "
        "permits specific to this worker — the graph has no direct "
        "worker-permit relationship yet."
    ),
    response_model=GraphQueryResponse,
    response_description="Permits related to the worker.",
)
def get_permits_by_worker(worker_id: str, service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.permits_by_worker(worker_id))


@router.get(
    "/equipment/{equipment_id}/incidents",
    summary="Get incidents by equipment",
    description=(
        "Returns incidents that occurred in the given equipment's zone. "
        "KNOWN LIMITATION: currently always returns an empty list — "
        "Equipment has no zone relationship in the graph because "
        "PostgreSQL's maintenance_logs table has no zone column."
    ),
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
    description=(
        "Returns the risk assessment(s) connected to the given incident. "
        "KNOWN LIMITATION: currently always returns an empty list — "
        "ingestion does not yet create a relationship linking an incident "
        "to the risk assessment that preceded it."
    ),
    response_model=GraphQueryResponse,
    response_description="Risk assessments linked to the incident.",
)
def get_risks_by_incident(incident_id: str, service: GraphQueryServiceDep) -> GraphQueryResponse:
    return GraphQueryResponse.model_validate(service.risks_by_incident(incident_id))
