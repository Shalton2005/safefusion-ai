"""
AI package for SafeFusion AI backend.

Top-level namespace for all machine-learning, computer-vision, and LLM
agent sub-systems. Deliberately independent of ``src.routes`` and
``src.server`` — nothing here imports FastAPI. Contains:

- :mod:`src.ai.graph`      — Reusable LangGraph workflow (state, nodes, builder). The
  entry node is the AI Supervisor.
- :mod:`src.ai.agents`     — AI Supervisor + specialized agents (Risk, Compliance,
  Knowledge, Emergency) that plug into the graph via an extensible registry/routing layer.
- :mod:`src.ai.config`     — Config contract (``GraphConfig``) decoupling this package from ``src.config.settings``.
- :mod:`src.ai.llm`        — Reusable Ollama-backed LLM generation service (default model
  ``llama3.1:8b``), with typed RAG/knowledge-graph/Risk-Engine context inputs and
  centralized prompts. Agents may use this to turn their structured output into an
  explainable natural-language response; it is not required for an agent's own
  structured contract.
- :mod:`src.ai.detection`  — Real-time hazard and PPE detection.
- :mod:`src.ai.analysis`   — Predictive analytics and incident analysis.
"""
