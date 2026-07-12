"""
Base repository for Neo4j knowledge-graph repositories.

Mirrors the constructor shape of :class:`~src.repositories.base.BaseRepository`
so that graph-backed repositories slot into the existing Route -> Service ->
Repository architecture.

Provides generic ``MERGE``-based primitives only — no domain-specific Cypher
(no knowledge-graph traversal/query methods) lives here. ``MERGE`` (rather
than ``CREATE``) is what makes every write idempotent: re-running an ingest
for a node or relationship that already exists updates its properties in
place instead of creating a duplicate.

Usage (future)::

    from src.repositories.graph_base import GraphBaseRepository

    class HazardGraphRepository(GraphBaseRepository):
        def get_related_hazards(self, zone_id: str) -> list[dict]:
            ...  # Cypher traversal query goes here
"""

from typing import Any, Mapping

from neo4j import Session


class GraphBaseRepository:
    """Base class for repositories backed by a Neo4j session.

    Args:
        session: An active :class:`~neo4j.Session` injected per request via
            :func:`~src.graph_database.session.get_graph_session`.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    # ── Generic write primitives ────────────────────────────────────────────

    def merge_node(self, label: str, key: str, key_value: Any, properties: Mapping[str, Any]) -> None:
        """Create or update a single node, keyed by one uniquely-identifying property.

        Matches an existing node with the given ``label`` and
        ``{key: key_value}``; creates it if absent. All entries in
        ``properties`` (which should include ``key``/``key_value`` itself)
        are then written with ``SET``, so calling this twice with the same
        key but different property values updates the node in place rather
        than creating a duplicate — the mechanism that makes ingestion both
        duplicate-free and safe to re-run incrementally.

        Args:
            label: Node label, e.g. ``"Worker"``.
            key: Property name used to identify the node, e.g. ``"id"``.
            key_value: Value of ``key`` for this specific node.
            properties: Full set of properties to write onto the node.
        """
        query = (
            f"MERGE (n:{label} {{{key}: $key_value}}) "
            "SET n += $properties"
        )
        self._session.run(query, key_value=key_value, properties=dict(properties))

    def merge_relationship(
        self,
        from_label: str,
        from_key: str,
        from_key_value: Any,
        to_label: str,
        to_key: str,
        to_key_value: Any,
        relationship_type: str,
        properties: Mapping[str, Any] | None = None,
    ) -> None:
        """Create or update a single directed relationship between two existing nodes.

        Matches both endpoint nodes by their identifying property, then
        ``MERGE``s the relationship between them. Re-running with the same
        endpoints and relationship type updates properties on the existing
        edge instead of creating a parallel duplicate.

        Args:
            from_label: Label of the source node.
            from_key: Identifying property name on the source node.
            from_key_value: Identifying property value on the source node.
            to_label: Label of the target node.
            to_key: Identifying property name on the target node.
            to_key_value: Identifying property value on the target node.
            relationship_type: Relationship type, e.g. ``"LOCATED_IN"``.
            properties: Optional properties to set on the relationship.
        """
        query = (
            f"MATCH (a:{from_label} {{{from_key}: $from_key_value}}) "
            f"MATCH (b:{to_label} {{{to_key}: $to_key_value}}) "
            f"MERGE (a)-[r:{relationship_type}]->(b) "
            "SET r += $properties"
        )
        self._session.run(
            query,
            from_key_value=from_key_value,
            to_key_value=to_key_value,
            properties=dict(properties or {}),
        )
