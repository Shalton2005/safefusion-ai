"""Configurable compound risk rules for SafeFusion AI.

Each rule inspects the sensor, worker, permit, and maintenance-derived
equipment-health monitoring summaries *together* and looks for zones where
multiple conditions co-occur — signals that are individually unremarkable
but jointly indicate elevated risk (e.g. a critical sensor reading in a
zone with no active permit).

Rules are pure, stateless, and pluggable: new rules can be added without
touching the engine or other rules, following the same ``Protocol``
strategy pattern used by ``src.services.risk_scoring``.
"""

from __future__ import annotations

from typing import Protocol

from src.services.compound_risk.schemas import CompoundRiskRuleMatch


def _sensor_zone_status_counts(sensor_summary: dict | None) -> dict[str, dict[str, int]]:
    """Return {zone: {"normal": n, "warning": n, "critical": n, "total": n}}."""
    totals: dict[str, dict[str, int]] = {}
    if not sensor_summary:
        return totals
    for sensor in sensor_summary.get("sensors", []):
        zone = sensor["zone"]
        counts = totals.setdefault(zone, {"normal": 0, "warning": 0, "critical": 0, "total": 0})
        counts["total"] += 1
        status = sensor["computed_status"]
        if status in counts:
            counts[status] += 1
    return totals


def _permit_zones_by_state(permit_summary: dict | None) -> dict[str, set[str]]:
    """Return {zone: {validation_states present in that zone}}."""
    zones: dict[str, set[str]] = {}
    if not permit_summary:
        return zones
    for permit in permit_summary.get("permits", []):
        zone = permit["zone"]
        zones.setdefault(zone, set()).add(permit["validation_state"])
    return zones


def _worker_counts_by_zone(worker_summary: dict | None) -> dict[str, int]:
    """Return {zone: worker_count}."""
    counts: dict[str, int] = {}
    if not worker_summary:
        return counts
    for worker in worker_summary.get("workers", []):
        zone = worker.get("assigned_zone")
        if not zone:
            continue
        counts[zone] = counts.get(zone, 0) + 1
    return counts


def _degraded_equipment(maintenance_summary: dict | None) -> list[dict]:
    """Return equipment rows whose derived health_status is 'degraded'."""
    if not maintenance_summary:
        return []
    return [
        row
        for row in maintenance_summary.get("equipment", [])
        if row.get("health_status") == "degraded"
    ]


class CompoundRiskRule(Protocol):
    """Contract implemented by every compound risk rule.

    A rule inspects the relevant monitoring summaries and returns a
    mapping of zone -> match for zones where its compound condition is
    satisfied. Zones with no match are omitted.

    ``maintenance_summary`` was added after the first three parameters —
    every existing rule accepts and may ignore it, so adding this
    parameter did not change how any pre-existing rule is called by
    ``CompoundRiskEngine.evaluate()``, which always passes all four
    positionally in this fixed order.
    """

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
        maintenance_summary: dict | None = None,
    ) -> dict[str, CompoundRiskRuleMatch]: ...


class CriticalSensorWithoutActivePermitRule:
    """Fires when a zone has a critical sensor reading but no valid permit.

    A critical reading in a zone that has no authorized, valid work permit
    means nobody is formally accountable for responding to it under a
    controlled procedure.
    """

    def __init__(self, points: float) -> None:
        self._points = points

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
        maintenance_summary: dict | None = None,
    ) -> dict[str, CompoundRiskRuleMatch]:
        sensor_zones = _sensor_zone_status_counts(sensor_summary)
        permit_zones = _permit_zones_by_state(permit_summary)

        matches: dict[str, CompoundRiskRuleMatch] = {}
        for zone, counts in sensor_zones.items():
            if counts["critical"] == 0:
                continue
            has_valid_permit = "valid" in permit_zones.get(zone, set())
            if has_valid_permit:
                continue
            matches[zone] = CompoundRiskRuleMatch(
                rule_name="critical_sensor_without_active_permit",
                points=self._points,
                explanation=(
                    f"Zone '{zone}' has {counts['critical']} critical sensor reading(s) "
                    "with no valid active permit covering the zone."
                ),
                evidence={
                    "sensor_status_counts": counts,
                    "permit_validation_states": sorted(permit_zones.get(zone, set())),
                },
            )
        return matches


class ExpiredPermitWithWorkerPresentRule:
    """Fires when a zone has an expired permit while workers are still assigned there.

    Work continuing under an expired permit is a direct compliance and
    safety violation, distinct from either signal alone.
    """

    def __init__(self, points: float) -> None:
        self._points = points

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
        maintenance_summary: dict | None = None,
    ) -> dict[str, CompoundRiskRuleMatch]:
        permit_zones = _permit_zones_by_state(permit_summary)
        worker_counts = _worker_counts_by_zone(worker_summary)

        matches: dict[str, CompoundRiskRuleMatch] = {}
        for zone, states in permit_zones.items():
            if "expired" not in states:
                continue
            worker_count = worker_counts.get(zone, 0)
            if worker_count == 0:
                continue
            matches[zone] = CompoundRiskRuleMatch(
                rule_name="expired_permit_with_worker_present",
                points=self._points,
                explanation=(
                    f"Zone '{zone}' has an expired permit while {worker_count} worker(s) "
                    "remain assigned to the zone."
                ),
                evidence={
                    "permit_validation_states": sorted(states),
                    "worker_count": worker_count,
                },
            )
        return matches


class CriticalSensorWithWorkerPresentRule:
    """Fires when a zone has a critical sensor reading while workers are present.

    Workers physically present in a zone with a critical environmental
    reading are in immediate danger, regardless of permit state.
    """

    def __init__(self, points: float) -> None:
        self._points = points

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
        maintenance_summary: dict | None = None,
    ) -> dict[str, CompoundRiskRuleMatch]:
        sensor_zones = _sensor_zone_status_counts(sensor_summary)
        worker_counts = _worker_counts_by_zone(worker_summary)

        matches: dict[str, CompoundRiskRuleMatch] = {}
        for zone, counts in sensor_zones.items():
            if counts["critical"] == 0:
                continue
            worker_count = worker_counts.get(zone, 0)
            if worker_count == 0:
                continue
            matches[zone] = CompoundRiskRuleMatch(
                rule_name="critical_sensor_with_worker_present",
                points=self._points,
                explanation=(
                    f"Zone '{zone}' has {counts['critical']} critical sensor reading(s) "
                    f"with {worker_count} worker(s) currently present."
                ),
                evidence={
                    "sensor_status_counts": counts,
                    "worker_count": worker_count,
                },
            )
        return matches


class RestrictedZoneWithoutActivePermitRule:
    """Fires when a worker is present in a configured restricted zone with no valid permit.

    Restricted zones require an active, valid permit for any presence;
    a worker there without one is an unauthorized-entry condition.
    """

    def __init__(self, points: float, restricted_zones: set[str]) -> None:
        self._points = points
        self._restricted_zones = restricted_zones

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
        maintenance_summary: dict | None = None,
    ) -> dict[str, CompoundRiskRuleMatch]:
        if not self._restricted_zones:
            return {}

        worker_counts = _worker_counts_by_zone(worker_summary)
        permit_zones = _permit_zones_by_state(permit_summary)

        matches: dict[str, CompoundRiskRuleMatch] = {}
        for zone in self._restricted_zones:
            worker_count = worker_counts.get(zone, 0)
            if worker_count == 0:
                continue
            has_valid_permit = "valid" in permit_zones.get(zone, set())
            if has_valid_permit:
                continue
            matches[zone] = CompoundRiskRuleMatch(
                rule_name="restricted_zone_without_active_permit",
                points=self._points,
                explanation=(
                    f"Restricted zone '{zone}' has {worker_count} worker(s) present "
                    "with no valid active permit."
                ),
                evidence={
                    "worker_count": worker_count,
                    "permit_validation_states": sorted(permit_zones.get(zone, set())),
                },
            )
        return matches


class MultipleWarningSensorsRule:
    """Fires when a zone has several warning-level sensors at once.

    A single warning-level reading is routine; multiple simultaneous
    warnings in one zone suggest a developing situation across systems
    rather than one noisy sensor.
    """

    def __init__(self, points: float, minimum_warning_count: int = 2) -> None:
        self._points = points
        self._minimum_warning_count = minimum_warning_count

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
        maintenance_summary: dict | None = None,
    ) -> dict[str, CompoundRiskRuleMatch]:
        sensor_zones = _sensor_zone_status_counts(sensor_summary)

        matches: dict[str, CompoundRiskRuleMatch] = {}
        for zone, counts in sensor_zones.items():
            if counts["warning"] < self._minimum_warning_count:
                continue
            matches[zone] = CompoundRiskRuleMatch(
                rule_name="multiple_warning_sensors",
                points=self._points,
                explanation=(
                    f"Zone '{zone}' has {counts['warning']} simultaneous warning-level "
                    "sensor readings."
                ),
                evidence={"sensor_status_counts": counts},
            )
        return matches


def _degraded_equipment_by_zone(
    maintenance_summary: dict | None, equipment_zone_map: dict[str, str]
) -> dict[str, list[dict]]:
    """Return {zone: [degraded equipment rows]} using a static equipment->zone lookup.

    ``MaintenanceLog`` has no ``zone`` field of its own (see
    ``src.services.maintenance_monitoring`` module docstring) — only
    ``equipment_id``. Correlating equipment health with a zone therefore
    requires an externally supplied mapping, the same way
    ``RestrictedZoneWithoutActivePermitRule`` needs a configured
    ``restricted_zones`` set rather than deriving it from monitoring data.
    """
    if not equipment_zone_map:
        return {}

    by_zone: dict[str, list[dict]] = {}
    for row in _degraded_equipment(maintenance_summary):
        zone = equipment_zone_map.get(row["equipment_id"])
        if zone is None:
            continue
        by_zone.setdefault(zone, []).append(row)
    return by_zone


class DegradedEquipmentWithWorkerPresentRule:
    """Fires when a worker is present in a zone containing degraded equipment.

    Equipment health is derived from maintenance history (see
    ``src.services.maintenance_monitoring.MaintenanceMonitoringService``):
    equipment currently under ongoing corrective work, or with a high
    corrective-to-total maintenance ratio, is "degraded". A worker
    physically present alongside degraded equipment is exposed to a
    failure that has not yet been resolved, independent of any sensor or
    permit signal.

    Reports reduced confidence (``0.7`` rather than full confidence): unlike
    a sensor threshold crossing or a permit state, "degraded" here is an
    *inferred* signal — there is no direct equipment-health measurement in
    this system, only a proxy computed from maintenance-log ratios/status.
    """

    _CONFIDENCE = 0.7

    def __init__(self, points: float, equipment_zone_map: dict[str, str]) -> None:
        self._points = points
        self._equipment_zone_map = equipment_zone_map

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
        maintenance_summary: dict | None = None,
    ) -> dict[str, CompoundRiskRuleMatch]:
        degraded_by_zone = _degraded_equipment_by_zone(maintenance_summary, self._equipment_zone_map)
        if not degraded_by_zone:
            return {}

        worker_counts = _worker_counts_by_zone(worker_summary)

        matches: dict[str, CompoundRiskRuleMatch] = {}
        for zone, degraded_rows in degraded_by_zone.items():
            worker_count = worker_counts.get(zone, 0)
            if worker_count == 0:
                continue
            equipment_ids = [row["equipment_id"] for row in degraded_rows]
            matches[zone] = CompoundRiskRuleMatch(
                rule_name="degraded_equipment_with_worker_present",
                points=self._points,
                explanation=(
                    f"Zone '{zone}' has {len(degraded_rows)} degraded equipment item(s) "
                    f"({', '.join(equipment_ids)}) with {worker_count} worker(s) present."
                ),
                evidence={"degraded_equipment": degraded_rows, "worker_count": worker_count},
                confidence=self._CONFIDENCE,
            )
        return matches


class CriticalSensorNearDegradedEquipmentRule:
    """Fires when a zone has a critical sensor reading and degraded equipment.

    A critical environmental reading co-occurring with equipment already
    known to be failing (or under active corrective repair) in the same
    zone suggests the equipment issue and the sensor excursion may share a
    root cause, or that the failing equipment cannot be trusted to respond
    correctly to the hazard (e.g. a faulty ventilation fan during a gas
    excursion).

    Reports reduced confidence (``0.7``) for the same reason as
    ``DegradedEquipmentWithWorkerPresentRule``: equipment health here is
    inferred from maintenance-log history, not a direct measurement.
    """

    _CONFIDENCE = 0.7

    def __init__(self, points: float, equipment_zone_map: dict[str, str]) -> None:
        self._points = points
        self._equipment_zone_map = equipment_zone_map

    def evaluate(
        self,
        sensor_summary: dict | None,
        permit_summary: dict | None,
        worker_summary: dict | None,
        maintenance_summary: dict | None = None,
    ) -> dict[str, CompoundRiskRuleMatch]:
        degraded_by_zone = _degraded_equipment_by_zone(maintenance_summary, self._equipment_zone_map)
        if not degraded_by_zone:
            return {}

        sensor_zones = _sensor_zone_status_counts(sensor_summary)

        matches: dict[str, CompoundRiskRuleMatch] = {}
        for zone, degraded_rows in degraded_by_zone.items():
            counts = sensor_zones.get(zone)
            if not counts or counts["critical"] == 0:
                continue
            equipment_ids = [row["equipment_id"] for row in degraded_rows]
            matches[zone] = CompoundRiskRuleMatch(
                rule_name="critical_sensor_near_degraded_equipment",
                points=self._points,
                explanation=(
                    f"Zone '{zone}' has {counts['critical']} critical sensor reading(s) "
                    f"alongside {len(degraded_rows)} degraded equipment item(s) "
                    f"({', '.join(equipment_ids)})."
                ),
                evidence={"sensor_status_counts": counts, "degraded_equipment": degraded_rows},
                confidence=self._CONFIDENCE,
            )
        return matches
