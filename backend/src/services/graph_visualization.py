"""
Graph visualization service for SafeFusion AI.

Shapes the raw node/relationship export from
:class:`~src.repositories.graph_visualization.GraphVisualizationRepository`
into a frontend-friendly JSON contract: ``nodes``, ``relationships``, and
``metadata``. This is a data-shaping layer only — no rendering, layout, or
coordinate computation happens here or anywhere in the backend; the
frontend's graph-rendering library owns all of that.

Node/edge ``id`` values are the Neo4j internal element id (a string,
stable for the lifetime of the node/relationship) so relationship
``source``/``target`` fields can reference node ``id`` values directly —
the exact shape graph-visualization libraries (Cytoscape.js, react-force-graph,
vis-network) expect or can trivially map to.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any, Protocol


class GraphVisualizationRepositoryPort(Protocol):
    """Repository contract required by ``GraphVisualizationService``."""

    def get_all_nodes(self, limit: int = 1_000) -> list[dict[str, Any]]: ...
    def get_all_relationships(self, limit: int = 5_000) -> list[dict[str, Any]]: ...


class GraphVisualizationService:
    """Builds a frontend-ready ``{nodes, relationships, metadata}`` graph payload.

    Args:
        repository: Whole-graph read repository.
    """

    def __init__(self, repository: GraphVisualizationRepositoryPort) -> None:
        self._repository = repository

    def get_visualization_data(
        self,
        node_limit: int = 1_000,
        relationship_limit: int = 5_000,
    ) -> dict[str, Any]:
        """Return the full knowledge graph as nodes, relationships, and metadata.

        Args:
            node_limit: Maximum number of nodes to include.
            relationship_limit: Maximum number of relationships to include.

        Returns:
            A dict with three top-level keys:

            - ``nodes``: list of ``{id, label, properties}``, where
              ``label`` is the node's primary Neo4j label (e.g. ``"Worker"``).
            - ``relationships``: list of ``{id, source, target, type, properties}``,
              where ``source``/``target`` reference a node's ``id``. Every
              relationship's endpoints are guaranteed present in ``nodes`` —
              relationships truncated out of the ``nodes`` list by
              ``node_limit`` (independent of ``relationship_limit``) are
              dropped rather than left dangling.
            - ``metadata``: counts and a per-type breakdown, useful for a
              frontend legend or filter UI without recomputing client-side.
        """
        raw_nodes = self._repository.get_all_nodes(limit=node_limit)
        raw_relationships = self._repository.get_all_relationships(limit=relationship_limit)

        nodes = [self._shape_node(node) for node in raw_nodes]
        relationships = [self._shape_relationship(rel) for rel in raw_relationships]

        # node_limit and relationship_limit are independent Cypher LIMITs, so
        # a relationship can reference a source/target node that got cut off
        # the nodes list. Drop those here rather than handing the frontend's
        # graph-rendering library a dangling edge it wasn't designed for.
        node_ids = {node["id"] for node in nodes}
        relationships = [
            rel for rel in relationships if rel["source"] in node_ids and rel["target"] in node_ids
        ]

        return {
            "nodes": nodes,
            "relationships": relationships,
            "metadata": self._build_metadata(nodes, relationships),
        }

    @staticmethod
    def _shape_node(node: dict[str, Any]) -> dict[str, Any]:
        """Map a raw repository node record into the frontend node contract."""
        labels = node["labels"]
        return {
            "id": node["id"],
            "label": labels[0] if labels else "Unknown",
            "properties": node["properties"],
        }

    @staticmethod
    def _shape_relationship(relationship: dict[str, Any]) -> dict[str, Any]:
        """Map a raw repository relationship record into the frontend edge contract."""
        return {
            "id": relationship["id"],
            "source": relationship["start_node_id"],
            "target": relationship["end_node_id"],
            "type": relationship["type"],
            "properties": relationship["properties"],
        }

    @staticmethod
    def _build_metadata(
        nodes: list[dict[str, Any]],
        relationships: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Summarize node/relationship counts for frontend legends and filters."""
        node_label_counts = Counter(node["label"] for node in nodes)
        relationship_type_counts = Counter(relationship["type"] for relationship in relationships)

        return {
            "node_count": len(nodes),
            "relationship_count": len(relationships),
            "node_labels": dict(sorted(node_label_counts.items())),
            "relationship_types": dict(sorted(relationship_type_counts.items())),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
