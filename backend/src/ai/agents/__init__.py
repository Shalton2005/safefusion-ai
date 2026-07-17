"""Specialized agents for the SafeFusion AI LangGraph workflow.

Empty scaffold. Each future agent (e.g. hazard-detection triage,
incident-report drafting, compliance review) should live in its own
module here as a node function operating on
:class:`~src.ai.graph.state.GraphState`, then get wired into the graph
built by :func:`src.ai.graph.build_graph`. No agent logic is implemented
yet — this package exists so the workflow has a known place to grow into.
"""
