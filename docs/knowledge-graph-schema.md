> [!NOTE]
> **This is an early architectural design document created at the start of the project.** For the final, up-to-date documentation that strictly reflects the implemented Hackathon submission, please refer to the primary [docs/](./README.md) hub (including [pi/](./api/README.md) and [rchitecture/](./architecture/README.md)).

# Knowledge Graph Schema Design

## Overview

The SafeFusion AI knowledge graph models the same operational entities as the PostgreSQL database (see [database-schema.md](./database-schema.md)) â€” workers, sensors, permits, equipment, zones, incidents, risk assessments, and maintenance activity â€” but as an explicit, traversable graph instead of loosely-coupled tables joined by free-text `zone` strings.

PostgreSQL remains the system of record for transactional writes. The graph, backed by [Neo4j](../backend/src/graph_database/), is optimized for the queries PostgreSQL struggles with: multi-hop relationship traversal, pattern matching across entity types, and "what is connected to what, and how" questions. See [backend/src/graph_database/](../backend/src/graph_database/) for the connection layer; no Cypher queries or repository logic exist yet â€” this document defines the schema they will be built against.

### Design goals

The schema is optimized for four query patterns:

1. **Compound Risk Detection** â€” finding zones where multiple independent risk factors co-occur (e.g. a critical sensor reading, an expired permit, and a present worker, all in the same zone).
2. **Worker Safety** â€” answering "is this worker currently safe" by traversing from a `Worker` outward to their zone's live sensors, active permits, and nearby equipment in one query.
3. **Permit Intelligence** â€” validating whether a permit's conditions still hold (zone sensors within safe bounds, no conflicting permits, equipment operable) without re-deriving state from scratch.
4. **Incident Investigation** â€” walking backward from an `Incident` to every contributing condition (risk score, sensor readings, permit state, equipment status, workers present) at the time it occurred.

### Why free-text `zone` becomes a first-class node

In PostgreSQL, `zone` is a repeated `String(50)` column with no foreign key on `workers`, `sensors`, `permits`, `incidents`, and `risk_scores` â€” a shared identifier without an enforced entity behind it. In the graph, `Zone` becomes a real node that every other entity relates to directly. This is what turns "these five tables happen to share a string value" into "these five entities are structurally connected," and it's the single change that makes compound risk detection a graph traversal instead of five separate SQL queries joined in application code.

---

## Node Definitions

Each node lists the properties expected to carry over from the existing SQLAlchemy models (see `backend/src/models/`), plus a stable `id` used to correlate back to the PostgreSQL row of record. No Cypher constraints or indexes are created yet â€” property names are specified so future implementation has an agreed contract.

### (:Worker)

| Property | Type | Notes |
|---|---|---|
| id | string (UUID) | Correlates to `workers.id` |
| employee_id | string | Unique, human-facing |
| name | string | |
| department | string | |
| role | string | |
| shift | string | |
| ppe_status | boolean | PPE compliance |
| status | string | `working` \| `idle` \| `emergency` |

### (:Sensor)

| Property | Type | Notes |
|---|---|---|
| id | string (UUID) | Correlates to `sensors.id` |
| sensor_type | string | `gas` \| `temperature` \| `pressure` \| `humidity` \| `smoke` |
| value | float | Latest reading |
| unit | string | |
| status | string | `normal` \| `warning` \| `critical` |
| timestamp | datetime | Last reading time |

### (:Permit)

| Property | Type | Notes |
|---|---|---|
| id | string (UUID) | Correlates to `permits.id` |
| permit_type | string | `hot_work` \| `confined_space` \| `electrical` |
| status | string | `active` \| `closed` \| `suspended` |
| issued_by | string | |
| assigned_team | string | |
| start_time | datetime | |
| end_time | datetime | |

### (:Equipment)

New node â€” no dedicated PostgreSQL table today (`MaintenanceLog.equipment_id`/`equipment_name` are free-text). Promoting it to a node lets maintenance history and zone placement attach to one stable identity.

| Property | Type | Notes |
|---|---|---|
| id | string | Correlates to `maintenance_logs.equipment_id` |
| name | string | Correlates to `maintenance_logs.equipment_name` |
| operational_status | string | Derived/maintained going forward (not in current model) |

### (:Zone)

New node â€” currently a repeated string field, not an entity. Becomes the graph's central hub.

| Property | Type | Notes |
|---|---|---|
| id | string | Zone code, e.g. `"Boiler-Area"` (matches existing string values) |
| name | string | Human-readable label |

### (:Incident)

| Property | Type | Notes |
|---|---|---|
| id | string (UUID) | Correlates to `incidents.id` |
| incident_type | string | `gas_leak` \| `fire` \| `explosion` \| `ppe_violation` \| `emergency_response` \| `worker_collapse` |
| severity | string | `low` \| `medium` \| `high` \| `critical` |
| description | string | |
| root_cause | string | Nullable |
| occurred_at | datetime | |

### (:Risk)

Corresponds to `RiskScore`. Modeled as its own node (rather than a `Zone` property) so a zone's risk history is queryable and an `Incident` can point to the specific assessment that preceded it.

| Property | Type | Notes |
|---|---|---|
| id | string (UUID) | Correlates to `risk_scores.id` |
| risk_score | float | 0.0â€“100.0 |
| risk_level | string | `low` \| `medium` \| `high` \| `critical` |
| contributing_factors | string | Nullable |
| analyzed_at | datetime | |

### (:Maintenance)

| Property | Type | Notes |
|---|---|---|
| id | string (UUID) | Correlates to `maintenance_logs.id` |
| maintenance_type | string | `preventive` \| `corrective` |
| status | string | `planned` \| `ongoing` \| `completed` |
| assigned_team | string | |
| start_time | datetime | Nullable |
| end_time | datetime | Nullable |

---

## Relationships

`Zone` is the hub every physical/operational entity connects through; `Incident` and `Risk` are the entities that connect *across* zones' worth of context to explain what happened.

| Relationship | Direction | Meaning |
|---|---|---|
| `(:Worker)-[:LOCATED_IN]->(:Zone)` | Worker â†’ Zone | Worker's current zone (`workers.current_zone`) |
| `(:Worker)-[:HAS_PERMIT]->(:Permit)` | Worker â†’ Permit | Worker is covered by a permit |
| `(:Sensor)-[:MONITORS]->(:Zone)` | Sensor â†’ Zone | Sensor reports readings for this zone |
| `(:Permit)-[:ISSUED_FOR]->(:Zone)` | Permit â†’ Zone | Permit's zone of validity (`permits.zone`) |
| `(:Equipment)-[:LOCATED_IN]->(:Zone)` | Equipment â†’ Zone | Equipment's physical zone |
| `(:Maintenance)-[:PERFORMED_ON]->(:Equipment)` | Maintenance â†’ Equipment | Maintenance activity targets equipment |
| `(:Incident)-[:OCCURRED_IN]->(:Zone)` | Incident â†’ Zone | Incident's zone (`incidents.zone`) |
| `(:Incident)-[:AFFECTED]->(:Worker)` | Incident â†’ Worker | Worker(s) involved in the incident |
| `(:Incident)-[:TRIGGERED_BY]->(:Risk)` | Incident â†’ Risk | Risk assessment that preceded/explains the incident |
| `(:Risk)-[:ASSESSES]->(:Zone)` | Risk â†’ Zone | Risk score's zone (`risk_scores.zone`) |
| `(:Risk)-[:DERIVED_FROM]->(:Sensor)` | Risk â†’ Sensor | Sensor readings that contributed to the score |
| `(:Risk)-[:DERIVED_FROM]->(:Permit)` | Risk â†’ Permit | Permit state (e.g. expired) that contributed to the score |

### Notes on relationship direction

Directions point from the "event/assessment" entity toward the "context" entity it describes (`Incident â†’ Zone`, `Risk â†’ Sensor`) rather than the reverse, so a query rooted at a `Zone` or `Sensor` node does not need to reverse-traverse to find what it explains. `LOCATED_IN` / `MONITORS` / `ISSUED_FOR` follow the same convention: the mobile or scoped entity points at the fixed one.

---

## How the schema serves each optimization target

**Compound Risk Detection** â€” starting from `(:Zone)`, one traversal reaches every `Sensor` (`MONITORS`), every active `Permit` (`ISSUED_FOR`), and every present `Worker` (`LOCATED_IN`) in a single query, instead of three separate SQL queries joined on a string in application code. `Risk.DERIVED_FROM` lets a compound rule cite exactly which sensor/permit produced the score.

**Worker Safety** â€” `(:Worker)-[:LOCATED_IN]->(:Zone)` is the single hop needed to then fan out to that zone's sensors and permits, answering "is this worker safe right now" in one traversal rooted at the worker.

**Permit Intelligence** â€” `(:Permit)-[:ISSUED_FOR]->(:Zone)<-[:MONITORS]-(:Sensor)` lets permit validation check live zone conditions directly, and `(:Worker)-[:HAS_PERMIT]->(:Permit)` supports "which workers are covered/uncovered" queries without a worker_id foreign key (which does not exist in the current relational schema).

**Incident Investigation** â€” `(:Incident)` fans out to `AFFECTED` workers, `OCCURRED_IN` zone, and `TRIGGERED_BY` risk, and from `Risk` continues to `DERIVED_FROM` sensors/permits â€” reconstructing the full causal chain behind an incident in one traversal instead of manually cross-referencing timestamps across five tables.

---

## Out of scope (by design)

Per current project scope, this document defines schema only. Not included:

- Cypher query implementations (repository/service logic).
- Constraints, indexes, or migration/seeding scripts.
- Synchronization strategy between PostgreSQL (system of record) and Neo4j (derived graph).
- Temporal/versioning model for sensor readings or risk scores (the schema above models current/latest state per node; history strategy is a follow-up decision).

