# AI & Computer Vision Workflows

SafeFusion AI integrates state-of-the-art AI modules to provide intelligent safety insights, autonomous monitoring, and explainable decision-making.

## AI Safety Copilot (LangGraph + Ollama)
- **Orchestration:** Built using LangGraph for stateful, multi-agent workflows.
- **Supervisor Agent:** A central routing agent that evaluates user prompts and delegates specialized tasks (e.g., retrieving sensor data, querying the RAG pipeline) to specialized sub-agents.
- **Local Inference:** Fully integrated with Ollama to run large language models locally. This ensures secure, on-premise inference without exposing sensitive plant data or proprietary safety manuals to external APIs.
- **Explainability:** Returns structured reasoning metrics, intermediate agent thought processes, and confidence scores alongside final verdicts, surfaced in the UI via the Reasoning and Explainable AI panels.

## Computer Vision Pipeline
- **Modules:** Real-time PPE (Personal Protective Equipment) compliance detection, Fire/Smoke hazard detection, and restricted Zone incursion tracking.
- **Integration:** The backend computes bounding box coordinates and confidence metrics which are securely streamed and synced with the React frontend overlay components over the CCTV Grid.
- **Optimization:** Reduces incident spam via temporal smoothing algorithms and configurable confidence thresholds before triggering automated alerts to the dashboard.

## Knowledge Graph & RAG (Retrieval-Augmented Generation)
- **Knowledge Graph (Neo4j):** Utilizes Neo4j to build a rich semantic understanding of the industrial environment (e.g., *Worker -> operates -> Machine -> located in -> Zone*). This allows the AI to calculate the downstream impact radius of a hazard instantly.
- **RAG Pipeline:** Ingests unstructured safety manuals, MSDS (Material Safety Data Sheets), and historical incident reports to provide context-aware answers. Results returned by the Copilot include precise page citations back to the original documents.
