# API Design

## Overview

This document defines the REST APIs used by SafeFusion AI to connect the frontend, backend, AI modules, and simulated industrial data sources.

The APIs are grouped by functional modules to ensure scalability, maintainability, and clear separation of responsibilities.

---

# API Modules

- Dashboard APIs
- Worker Management APIs
- Sensor APIs
- Permit Management APIs
- Maintenance APIs
- Risk Analysis APIs
- Alert APIs
- AI Copilot APIs
- Incident APIs
- Emergency Response APIs
- Compliance APIs

---

# 1. Dashboard APIs

## GET /dashboard

Purpose:
Retrieve the complete dashboard summary.

Returns:
- Overall Risk Score
- Active Alerts
- Worker Count
- Active Permits
- Sensor Summary
- Plant Status

---

## GET /dashboard/summary

Purpose:
Retrieve quick statistics for dashboard cards.

Returns:
- Safe Zones
- Critical Zones
- Active Workers
- Critical Alerts

---

# 2. Worker APIs

## GET /workers

Purpose:
Retrieve all workers with current location.

Returns:
- Worker Details
- Current Zone
- PPE Status
- Shift

---

## GET /workers/{id}

Purpose:
Retrieve details of a specific worker.

---

# 3. Sensor APIs

## GET /sensors

Purpose:
Retrieve latest sensor readings.

Returns:
- Gas
- Temperature
- Pressure
- Humidity

---

## POST /sensor-data

Purpose:
Receive new sensor data from the simulator.

Input:
- Sensor ID
- Zone
- Sensor Type
- Reading
- Timestamp

---

# 4. Permit APIs

## GET /permits

Purpose:
Retrieve all active permits.

---

## POST /permit

Purpose:
Create a new Permit-to-Work.

Input:
- Permit Type
- Zone
- Assigned Team
- Duration

---

# 5. Maintenance APIs

## GET /maintenance

Purpose:
Retrieve maintenance activities.

---

## POST /maintenance

Purpose:
Create a maintenance record.

Input:
- Equipment
- Maintenance Type
- Team
- Status

---

# 6. Risk Analysis APIs

## POST /risk-analysis

Purpose:
Run AI-based compound risk analysis.

Input:
- Sensor Data
- Permit Data
- Worker Data
- Maintenance Data

Returns:
- Risk Score
- Risk Level
- Contributing Factors
- Recommended Actions

---

## GET /risk-score

Purpose:
Retrieve the latest plant risk score.

---

# 7. Alert APIs

## GET /alerts

Purpose:
Retrieve all active alerts.

---

## POST /alerts/acknowledge

Purpose:
Mark an alert as acknowledged.

Input:
- Alert ID

---

# 8. AI Safety Copilot APIs

## POST /chat

Purpose:
Interact with the AI Safety Copilot.

Input:
- User Query

Returns:
- AI Response
- References
- Recommendations

---

# 9. Incident APIs

## GET /incidents

Purpose:
Retrieve historical incident reports.

---

## POST /incident-report

Purpose:
Generate an AI-assisted incident report.

Input:
- Incident Details
- Risk Analysis

Returns:
- Incident Summary
- Root Cause
- Recommended Actions

---

# 10. Emergency Response APIs

## POST /emergency-response/run

Purpose:
Run the Compound Risk Engine against the latest monitoring data, map each
affected zone's risk conditions to predefined emergency actions using
configurable threshold rules, and dispatch the resulting actions.

Returns:
- Zone Count
- Per-Zone Risk Score, Risk Level
- Dispatched Actions (Evacuate Area, Stop Work, Isolate Equipment, Notify
  Safety Officer, Notify Control Room, Generate Incident)
- Explanation

---

## POST /emergency-response/evaluate

Purpose:
Map a caller-supplied Compound Risk Engine result directly to predefined
emergency actions, without re-running risk detection. Useful when the
caller already has a compound risk result on hand (e.g. from a prior
`/monitoring/compound-risk` run).

Input:
- Zone Compound Risk Results (zone, risk score, risk level, triggered
  rules)

Returns:
- Zone Count
- Per-Zone Risk Score, Risk Level
- Dispatched Actions
- Explanation

Notes:
- Purely rule-based — no LLMs/AI involved.
- A zone can trigger multiple actions at once (e.g. Notify Safety Officer,
  Stop Work, and Evacuate Area simultaneously).
- Action thresholds are centrally configured in
  `backend/src/config/risk_rules.py` (`EMERGENCY_RESPONSE_RULES`) and
  `backend/src/config/settings.py` — no action logic is hardcoded in
  routes or services.
- The `generate_incident` action persists a new record via the existing
  Incident repository; all other actions are dispatched as structured,
  logged records (the integration point for future notification/SCADA
  adapters).

---

# 11. Compliance APIs

## GET /compliance/incidents/{incident_id}

Purpose:
Evaluate a single detected incident against predefined regulatory
compliance rules (Factory Act, OISD, DGMS).

Returns:
- Compliance Status (Compliant / Non-Compliant)
- Violated Rules (framework, title, description)
- Recommendations

---

## POST /compliance/evaluate

Purpose:
Evaluate a paginated set of detected incidents against predefined
regulatory compliance rules.

Input:
- Pagination (skip, limit)

Returns:
- Incident Count
- Non-Compliant Count
- Per-Incident Compliance Status, Violated Rules, Recommendations

Notes:
- Purely rule-based — no LLMs/AI involved. Rules are attribute
  comparisons (incident type, severity) against a centrally configured
  registry in `backend/src/config/compliance_rules.py`.
- Supports Factory Act, OISD, and DGMS frameworks; adding a rule or a new
  framework requires only a new registry entry, not engine changes.
- Each violation carries an empty `citations` field today. This is a
  RAG-readiness seam (`backend/src/services/compliance/knowledge_source.py`):
  once LangChain + pgvector document retrieval (already planned per
  `docs/tech-stack.md` for OISD/Factory Act/DGMS/Incident Reports) is
  wired in, violations will be enriched with supporting citations without
  any change to the rule engine itself.

---

# Future APIs

These endpoints are planned for future versions:

- Authentication
- User Management
- Notification Services (real delivery integrations; dispatch logging exists today via Emergency Response APIs)
- Audit Logs
- Compliance Reports

---

# API Design Principles

- RESTful API architecture
- JSON request and response format
- Stateless communication
- Modular endpoint design
- Easy integration with AI services
- Scalable for future enterprise deployment