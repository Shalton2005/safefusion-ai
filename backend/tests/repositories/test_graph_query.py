"""Tests for GraphQueryRepository's failure handling (src.repositories.graph_query)."""

from __future__ import annotations

import logging
import time

import neo4j.exceptions
import pytest
from neo4j import GraphDatabase

from src.repositories.graph_exceptions import GraphUnavailableError
from src.repositories.graph_query import GraphQueryRepository

_UNREACHABLE_URI = "bolt://localhost:1"


class _RaisingSession:
    """Fake Neo4j session whose ``run`` always raises a given driver exception."""

    def __init__(self, exc: Exception) -> None:
        self._exc = exc

    def run(self, *args: object, **kwargs: object) -> None:
        raise self._exc


class _SucceedingSession:
    """Fake Neo4j session whose ``run`` returns a fixed, empty record set."""

    def run(self, *args: object, **kwargs: object) -> list:
        return []


class TestGraphQueryRepositoryFailureHandling:
    def test_service_unavailable_is_converted_to_graph_unavailable_error(self) -> None:
        session = _RaisingSession(neo4j.exceptions.ServiceUnavailable("connection refused"))
        repo = GraphQueryRepository(session)

        with pytest.raises(GraphUnavailableError):
            repo.list_workers()

    def test_session_expired_is_converted_to_graph_unavailable_error(self) -> None:
        session = _RaisingSession(neo4j.exceptions.SessionExpired("session expired"))
        repo = GraphQueryRepository(session)

        with pytest.raises(GraphUnavailableError):
            repo.get_workers_by_zone("Zone-A")

    def test_neo4j_client_error_is_converted_to_graph_unavailable_error(self) -> None:
        session = _RaisingSession(neo4j.exceptions.ClientError("bad query"))
        repo = GraphQueryRepository(session)

        with pytest.raises(GraphUnavailableError):
            repo.list_zones()

    def test_every_query_method_goes_through_the_same_conversion(self) -> None:
        session = _RaisingSession(neo4j.exceptions.ServiceUnavailable("down"))
        repo = GraphQueryRepository(session)

        methods = [
            repo.list_workers,
            repo.list_zones,
            repo.list_permits,
            repo.list_incidents,
            repo.list_risks,
        ]
        for method in methods:
            with pytest.raises(GraphUnavailableError):
                method()

        with pytest.raises(GraphUnavailableError):
            repo.get_workers_by_zone("Zone-A")
        with pytest.raises(GraphUnavailableError):
            repo.get_permits_by_worker("W1")
        with pytest.raises(GraphUnavailableError):
            repo.get_incidents_by_equipment("E1")
        with pytest.raises(GraphUnavailableError):
            repo.get_sensors_by_zone("Zone-A")
        with pytest.raises(GraphUnavailableError):
            repo.get_risks_by_incident("I1")


class TestGraphQueryRepositoryAgainstUnreachableServer:
    """Slower, closer-to-real tests against an actually unreachable Neo4j endpoint."""

    def test_unreachable_neo4j_fails_within_a_bounded_time(self) -> None:
        driver = GraphDatabase.driver(_UNREACHABLE_URI, auth=("neo4j", "x"), connection_timeout=2.0)
        session = driver.session(database="neo4j")
        repo = GraphQueryRepository(session)

        try:
            start = time.monotonic()
            with pytest.raises(GraphUnavailableError):
                repo.list_workers()
            elapsed = time.monotonic() - start

            assert elapsed < 30.0
        finally:
            session.close()
            driver.close()


class TestGraphQueryRepositoryTiming:
    def test_successful_query_logs_a_graph_query_timing_line(self, caplog) -> None:
        repo = GraphQueryRepository(_SucceedingSession())

        with caplog.at_level(logging.INFO, logger="src.repositories.graph_query"):
            repo.list_workers()

        timing_lines = [r.message for r in caplog.records if "operation=graph_query" in r.message]
        assert len(timing_lines) == 1
        assert "duration_ms=" in timing_lines[0]

    def test_each_query_method_call_logs_its_own_timing_line(self, caplog) -> None:
        repo = GraphQueryRepository(_SucceedingSession())

        with caplog.at_level(logging.INFO, logger="src.repositories.graph_query"):
            repo.list_workers()
            repo.list_zones()
            repo.get_workers_by_zone("Zone-A")

        timing_lines = [r.message for r in caplog.records if "operation=graph_query" in r.message]
        assert len(timing_lines) == 3
