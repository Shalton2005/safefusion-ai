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

# Future APIs

These endpoints are planned for future versions:

- Authentication
- User Management
- Notification Services
- Audit Logs
- Compliance Reports
- Emergency Response Automation

---

# API Design Principles

- RESTful API architecture
- JSON request and response format
- Stateless communication
- Modular endpoint design
- Easy integration with AI services
- Scalable for future enterprise deployment