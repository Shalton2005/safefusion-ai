"""
AI package for SafeFusion AI backend.

Top-level namespace for all machine-learning, computer-vision, and LLM
agent sub-systems. Deliberately independent of ``src.routes`` and
``src.server`` — nothing here imports FastAPI. Contains:

- :mod:`src.ai.graph`      — Reusable LangGraph workflow (state, nodes, builder).
- :mod:`src.ai.agents`     — Specialized agents that plug into the graph (empty scaffold).
- :mod:`src.ai.config`     — Config contract (``GraphConfig``) decoupling this package from ``src.config.settings``.
- :mod:`src.ai.detection`  — Real-time hazard and PPE detection.
- :mod:`src.ai.analysis`   — Predictive analytics and incident analysis.
"""
