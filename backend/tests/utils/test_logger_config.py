"""Tests for the logging configuration itself (src.utils.logger).

Covers a real, pre-existing bug found while adding AI observability: the
dictConfig "loggers" section only matches loggers by exact name
("safefusion", "uvicorn", "sqlalchemy.engine", ...), but every module in
this codebase calls get_logger(__name__), producing names like
"src.ai.agents.supervisor" that match none of those entries. Such
loggers fall through to the "root" config, which used to be hardcoded to
WARNING — silently dropping every module's logger.info() call, including
the new timing instrumentation this module exists to support.
"""

from __future__ import annotations

import logging

from src.utils.logger import configure_logging, get_logger


class TestApplicationLoggersReachInfo:
    def test_a_src_namespaced_logger_has_info_level_effective(self) -> None:
        configure_logging()

        logger = get_logger("src.ai.agents.supervisor")

        assert logger.getEffectiveLevel() == logging.INFO

    def test_info_call_on_a_src_namespaced_logger_is_actually_emitted(self, caplog) -> None:
        configure_logging()
        logger = get_logger("src.repositories.graph_query")

        with caplog.at_level(logging.INFO):
            logger.info("operation=graph_query duration_ms=12.34")

        assert any("operation=graph_query" in record.message for record in caplog.records)


class TestThirdPartyLoggersAreQuieted:
    """Root now defaults to INFO, so chatty third-party libraries need their own entry."""

    def test_httpx_is_quieted_to_warning(self) -> None:
        configure_logging()

        assert logging.getLogger("httpx").getEffectiveLevel() == logging.WARNING

    def test_httpcore_is_quieted_to_warning(self) -> None:
        configure_logging()

        assert logging.getLogger("httpcore").getEffectiveLevel() == logging.WARNING

    def test_neo4j_is_quieted_to_warning(self) -> None:
        configure_logging()

        assert logging.getLogger("neo4j").getEffectiveLevel() == logging.WARNING

    def test_langchain_ollama_is_quieted_to_warning(self) -> None:
        configure_logging()

        assert logging.getLogger("langchain_ollama").getEffectiveLevel() == logging.WARNING
