> [!NOTE]
> **This is an early architectural design document created at the start of the project.** For the final, up-to-date documentation that strictly reflects the implemented Hackathon submission, please refer to the primary [docs/](./README.md) hub (including [pi/](./api/README.md) and [rchitecture/](./architecture/README.md)).

# Database Schema Design

## Overview

The SafeFusion AI database is designed to store operational, safety, and AI-generated data required for proactive industrial risk detection.

The system integrates information from multiple industrial sources including IoT sensors, worker tracking, permit-to-work systems, maintenance records, AI-generated alerts, and historical incidents.

---

# Database Overview

| Table | Purpose |
|--------|---------|
| workers | Stores worker information and current status |
| sensors | Stores real-time IoT/SCADA sensor readings |
| permits | Stores active and historical Permit-to-Work records |
| maintenance_logs | Stores maintenance activities and equipment status |
| incidents | Stores historical and simulated industrial incidents |
| alerts | Stores AI-generated safety alerts |
| risk_scores | Stores compound risk analysis results |

---

# Table Design

---

## 1. workers

### Purpose

Stores worker details, location, shift information, and PPE compliance.

| Field | Type | Description |
|------|------|-------------|
| worker_id | UUID | Unique worker identifier |
| name | String | Worker name |
| employee_id | String | Employee ID |
| department | String | Department |
| role | String | Job role |
| current_zone | String | Current plant zone |
| ppe_status | Boolean | PPE compliance status |
| shift | String | Current shift |
| status | String | Working / Idle / Emergency |
| updated_at | Timestamp | Last location update |

---

## 2. sensors

### Purpose

Stores live industrial sensor readings received from simulated IoT and SCADA systems.

| Field | Type | Description |
|------|------|-------------|
| sensor_id | UUID | Sensor identifier |
| zone | String | Plant zone |
| sensor_type | String | Gas / Temperature / Pressure / Humidity |
| value | Float | Current reading |
| unit | String | Measurement unit |
| status | String | Normal / Warning / Critical |
| timestamp | Timestamp | Reading time |

---

## 3. permits

### Purpose

Stores Permit-to-Work information.

| Field | Type | Description |
|------|------|-------------|
| permit_id | UUID | Permit identifier |
| permit_type | String | Hot Work / Confined Space / Electrical |
| zone | String | Work location |
| issued_by | String | Safety officer |
| assigned_team | String | Responsible team |
| start_time | Timestamp | Permit start |
| end_time | Timestamp | Permit expiry |
| status | String | Active / Closed / Suspended |

---

## 4. maintenance_logs

### Purpose

Stores maintenance activities affecting industrial equipment.

| Field | Type | Description |
|------|------|-------------|
| maintenance_id | UUID | Maintenance identifier |
| equipment_id | String | Equipment reference |
| equipment_name | String | Equipment name |
| maintenance_type | String | Preventive / Corrective |
| assigned_team | String | Maintenance team |
| status | String | Planned / Ongoing / Completed |
| start_time | Timestamp | Start time |
| end_time | Timestamp | Completion time |

---

## 5. incidents

### Purpose

Stores historical and simulated industrial incidents used for analytics and RAG.

| Field | Type | Description |
|------|------|-------------|
| incident_id | UUID | Incident identifier |
| zone | String | Incident location |
| severity | String | Low / Medium / High / Critical |
| incident_type | String | Gas Leak / Fire / Explosion / PPE Violation |
| description | Text | Incident summary |
| root_cause | Text | Root cause analysis |
| occurred_at | Timestamp | Incident time |

---

## 6. alerts

### Purpose

Stores AI-generated safety alerts.

| Field | Type | Description |
|------|------|-------------|
| alert_id | UUID | Alert identifier |
| zone | String | Affected zone |
| alert_type | String | Warning / Critical |
| message | Text | Alert description |
| generated_by | String | AI Engine |
| status | String | Active / Acknowledged / Resolved |
| generated_at | Timestamp | Alert creation time |

---

## 7. risk_scores

### Purpose

Stores AI-generated compound risk analysis results.

| Field | Type | Description |
|------|------|-------------|
| risk_id | UUID | Risk identifier |
| zone | String | Plant zone |
| risk_score | Float | Risk score (0â€“100) |
| risk_level | String | Low / Medium / High / Critical |
| contributing_factors | Text | Factors influencing risk |
| recommendation | Text | Suggested preventive action |
| analyzed_at | Timestamp | Analysis timestamp |


# Entity Relationships

```
workers
    â”‚
    â”œâ”€â”€ belongs_to â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º permits
    â”‚
    â”œâ”€â”€ located_in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º sensors
    â”‚
    â””â”€â”€ affected_by â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º alerts

permits
    â”‚
    â””â”€â”€ linked_to â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º maintenance_logs

maintenance_logs
    â”‚
    â””â”€â”€ influences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º risk_scores

sensors
    â”‚
    â””â”€â”€ contribute_to â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º risk_scores

incidents
    â”‚
    â””â”€â”€ referenced_by â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º risk_scores

risk_scores
    â”‚
    â””â”€â”€ generate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º alerts
```


# Future Enhancements

The following tables may be introduced in future versions as the project evolves:

- equipment
- plant_zones
- compliance_records
- audit_logs
- emergency_response_logs
- ai_agent_logs
- notifications


# Design Notes

- PostgreSQL will be used as the primary relational database.
- Neo4j will model equipment, workers, permits, sensors, and incident relationships for AI reasoning.
- pgvector will store document embeddings for Retrieval-Augmented Generation (RAG).
- Real industrial sensor data will be simulated for demonstration purposes.
- The schema is intentionally modular to support future scalability and enterprise deployment.
