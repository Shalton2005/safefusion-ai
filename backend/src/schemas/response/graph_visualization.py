"""Response schemas for the knowledge graph visualization endpoint.

Node/relationship ``properties`` are dynamic (see
``src/schemas/response/graph_query.py`` for the same rationale), so only
the envelope structure is strictly typed — the shape a frontend
graph-rendering library needs to plot nodes and edges, not the domain
fields within them.
"""

from typing import Any

from src.schemas.base import AppBaseModel


class GraphVisualizationNode(AppBaseModel):
    """A single graph node, ready for frontend rendering.

    Attributes:
        id: Stable node identifier (Neo4j internal element id).
        label: Primary node label, e.g. ``"Worker"`` or ``"Zone"``.
        properties: The node's stored property dict.
    """

    id: str
    label: str
    properties: dict[str, Any]


class GraphVisualizationRelationship(AppBaseModel):
    """A single graph relationship (edge), ready for frontend rendering.

    Attributes:
        id: Stable relationship identifier (Neo4j internal element id).
        source: ``id`` of the relationship's source node.
        target: ``id`` of the relationship's target node.
        type: Relationship type, e.g. ``"LOCATED_IN"``.
        properties: The relationship's stored property dict.
    """

    id: str
    source: str
    target: str
    type: str
    properties: dict[str, Any]


class GraphVisualizationMetadata(AppBaseModel):
    """Summary counts describing the returned graph payload.

    Attributes:
        node_count: Total number of nodes returned.
        relationship_count: Total number of relationships returned.
        node_labels: Node count grouped by label.
        relationship_types: Relationship count grouped by type.
        generated_at: ISO-8601 timestamp of when this payload was built.
    """

    node_count: int
    relationship_count: int
    node_labels: dict[str, int]
    relationship_types: dict[str, int]
    generated_at: str


class GraphVisualizationResponse(AppBaseModel):
    """Full knowledge graph, shaped for frontend graph-visualization libraries."""

    nodes: list[GraphVisualizationNode]
    relationships: list[GraphVisualizationRelationship]
    metadata: GraphVisualizationMetadata
