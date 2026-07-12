"""Compliance Rule Engine package for SafeFusion AI.

Evaluates detected incidents against predefined regulatory compliance
rules (Factory Act, OISD, DGMS) and returns compliance status, violated
rules, and recommendations. Purely rule-based, no AI/ML involved. The
``knowledge_source`` seam prepares the architecture for future
Retrieval-Augmented Generation (RAG) integration without requiring
engine/service changes when it lands.
"""

from src.services.compliance.compliance_service import ComplianceService
from src.services.compliance.engine import ComplianceRuleEngine
from src.services.compliance.knowledge_source import (
    ComplianceKnowledgeSourcePort,
    NullKnowledgeSource,
)
from src.services.compliance.rules import ComplianceRule, IncidentAttributeComplianceRule
from src.services.compliance.schemas import ComplianceViolation, IncidentComplianceResult

__all__ = [
    "ComplianceService",
    "ComplianceRuleEngine",
    "ComplianceKnowledgeSourcePort",
    "NullKnowledgeSource",
    "ComplianceRule",
    "IncidentAttributeComplianceRule",
    "ComplianceViolation",
    "IncidentComplianceResult",
]
