"""
Graph visualization repository for SafeFusion AI.

Read-only export of the entire knowledge graph — every node and every
relationship — for frontend graph-rendering libraries. Distinct from
:class:`~src.repositories.graph_query.GraphQueryRepository`, which answers
targeted lookups (e.g. "workers in this zone"); this repository always
returns the full graph in one call, using the generic
:meth:`~src.repositories.graph_base.GraphBaseRepository.list_all_nodes` and
:meth:`~src.repositories.graph_base.GraphBaseRepository.list_all_relationships`
primitives.

No layout, coordinates, or rendering happen here or anywhere else in the
backend — this repository only returns raw graph structure. Positioning
and drawing are entirely a frontend concern.
"""

from typing import Any

from src.repositories.graph_base import GraphBaseRepository


class GraphVisualizationRepository(GraphBaseRepository):
    """Whole-graph read access for visualization export."""

    def get_all_nodes(self, limit: int = 1_000) -> list[dict[str, Any]]:
        """Return every node in the graph, across all labels."""
        return self.list_all_nodes(limit=limit)

    def get_all_relationships(self, limit: int = 5_000) -> list[dict[str, Any]]:
        """Return every relationship in the graph, across all types."""
        return self.list_all_relationships(limit=limit)
