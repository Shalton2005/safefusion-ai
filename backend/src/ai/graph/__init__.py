"""LangGraph workflow package for SafeFusion AI.

Public surface: :func:`build_graph` / :func:`get_compiled_graph` (see
``builder.py``) construct a compiled graph from a
:class:`~src.ai.config.GraphConfig`; :class:`~src.ai.graph.state.GraphState`
is the state contract every node reads and writes.

This package has no FastAPI dependency — it is called from routes via a
thin dependency (e.g. ``src/routes/*.py``), but is equally usable from a
script, a worker, or a test.
"""

from src.ai.graph.builder import build_graph, get_compiled_graph
from src.ai.graph.state import GraphState


__all__ = ["build_graph", "get_compiled_graph", "GraphState"]
