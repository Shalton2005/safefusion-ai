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
- :mod:`src.ai.prompts`    — Reusable prompt templates (Risk Analysis, Compliance,
  Emergency Response, Recommendations, Incident Investigation, and a General
  fallback), stored separately from :mod:`src.ai.llm`'s generation logic and
  :mod:`src.ai.copilot`'s orchestration. Selected by domain name via
  ``src.ai.prompts.get_template``.
- :mod:`src.ai.llm`        — Reusable Ollama-backed LLM generation service (default model
  ``llama3.1:8b``), with typed RAG/knowledge-graph/Risk-Engine context inputs. Selects a
  template from :mod:`src.ai.prompts` per call. Agents may use this to turn their
  structured output into an explainable natural-language response; it is not required
  for an agent's own structured contract.
- :mod:`src.ai.copilot`    — AI Safety Copilot: implements the query/explain/recommend/chat
  operations exposed at ``/ai/*`` (see ``src/routes/ai_copilot.py``) over the LangGraph
  Supervisor, combining agent output with :mod:`src.ai.llm` for explainable generation.
- :mod:`src.ai.detection`  — Real-time hazard and PPE detection.
- :mod:`src.ai.analysis`   — Predictive analytics and incident analysis.
"""
