"""Tests for the centralised recommendation rule configuration."""

from __future__ import annotations

from src.config.recommendation_rules import (
    COMPLIANCE_FRAMEWORK_SEVERITY_OFFSET,
    COMPOUND_RISK_MESSAGE_TEMPLATES,
    EMERGENCY_ACTION_MESSAGE_TEMPLATES,
    EMERGENCY_ACTION_SEVERITY_OFFSET,
    RISK_LEVEL_SEVERITY_OFFSET,
    SOURCE_PRIORITY,
)
from src.models.enums import ComplianceFramework, EmergencyActionType, RecommendationSource, RiskLevel


class TestSourcePriority:
    def test_all_sources_have_a_priority(self) -> None:
        assert set(SOURCE_PRIORITY) == set(RecommendationSource)

    def test_emergency_response_ranks_above_compound_risk(self) -> None:
        assert SOURCE_PRIORITY[RecommendationSource.EMERGENCY_RESPONSE] < SOURCE_PRIORITY[RecommendationSource.COMPOUND_RISK]

    def test_compound_risk_ranks_above_compliance(self) -> None:
        assert SOURCE_PRIORITY[RecommendationSource.COMPOUND_RISK] < SOURCE_PRIORITY[RecommendationSource.COMPLIANCE]

    def test_priority_bands_never_overlap_with_severity_offsets(self) -> None:
        # The largest severity offset used by any generator must stay
        # smaller than the gap between adjacent source priority bands,
        # otherwise a low-severity item from a higher-priority source
        # could sort after a high-severity item from a lower one.
        max_offset = max(
            max(RISK_LEVEL_SEVERITY_OFFSET.values()),
            max(EMERGENCY_ACTION_SEVERITY_OFFSET.values()),
            max(COMPLIANCE_FRAMEWORK_SEVERITY_OFFSET.values()),
        )
        band_gaps = sorted(SOURCE_PRIORITY.values())
        smallest_gap = min(b - a for a, b in zip(band_gaps, band_gaps[1:]))
        assert max_offset < smallest_gap


class TestSeverityOffsets:
    def test_risk_level_offsets_cover_every_level(self) -> None:
        assert set(RISK_LEVEL_SEVERITY_OFFSET) == set(RiskLevel)

    def test_risk_level_offsets_ascend_with_decreasing_severity(self) -> None:
        assert (
            RISK_LEVEL_SEVERITY_OFFSET[RiskLevel.CRITICAL]
            < RISK_LEVEL_SEVERITY_OFFSET[RiskLevel.HIGH]
            < RISK_LEVEL_SEVERITY_OFFSET[RiskLevel.MEDIUM]
            < RISK_LEVEL_SEVERITY_OFFSET[RiskLevel.LOW]
        )

    def test_compliance_framework_offsets_cover_every_framework(self) -> None:
        assert set(COMPLIANCE_FRAMEWORK_SEVERITY_OFFSET) == set(ComplianceFramework)


class TestMessageTemplates:
    def test_every_risk_level_has_a_compound_risk_template(self) -> None:
        assert set(COMPOUND_RISK_MESSAGE_TEMPLATES) == set(RiskLevel)

    def test_every_emergency_action_has_a_message_template(self) -> None:
        assert set(EMERGENCY_ACTION_MESSAGE_TEMPLATES) == set(EmergencyActionType)

    def test_compound_risk_templates_are_formattable(self) -> None:
        for template in COMPOUND_RISK_MESSAGE_TEMPLATES.values():
            assert template.format(zone="Zone-A", risk_score=50.0)

    def test_emergency_action_templates_are_formattable(self) -> None:
        for template in EMERGENCY_ACTION_MESSAGE_TEMPLATES.values():
            assert template.format(zone="Zone-A")
