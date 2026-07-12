"""Response schemas for knowledge-graph query results.

Graph node properties are dynamic — ``MERGE``-written by the generic
:meth:`~src.repositories.graph_base.GraphBaseRepository.merge_node` primitive
rather than a fixed set of typed columns — so records are returned as
``dict``, not a per-entity typed model. The envelope itself (query name,
lookup key, count) is strictly typed like every other response schema.
"""

from typing import Any

from src.schemas.base import AppBaseModel


class GraphQueryResponse(AppBaseModel):
    """Structured result of a single graph query lookup.

    Attributes:
        query: Name of the query that produced this result, e.g. ``"workers_by_zone"``.
        count: Number of records returned.
        records: The matched graph nodes, each as a plain property dict.
    """

    query: str
    count: int
    records: list[dict[str, Any]]
