"""Add emergency_response incident type support.

Revision ID: ae2ae7dbbde7
Revises: d373798abda5
Create Date: 2026-07-11 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "ae2ae7dbbde7"
down_revision: Union[str, None] = "d373798abda5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Allow EMERGENCY_RESPONSE in incidents.incident_type CHECK constraint."""
    op.execute("ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidenttype")
    op.execute(
        """
        ALTER TABLE incidents
        ADD CONSTRAINT incidenttype
        CHECK (incident_type IN ('GAS_LEAK', 'FIRE', 'EXPLOSION', 'PPE_VIOLATION', 'EMERGENCY_RESPONSE'))
        """
    )


def downgrade() -> None:
    """Remove EMERGENCY_RESPONSE from incidents.incident_type CHECK constraint."""
    op.execute("DELETE FROM incidents WHERE incident_type = 'EMERGENCY_RESPONSE'")
    op.execute("ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidenttype")
    op.execute(
        """
        ALTER TABLE incidents
        ADD CONSTRAINT incidenttype
        CHECK (incident_type IN ('GAS_LEAK', 'FIRE', 'EXPLOSION', 'PPE_VIOLATION'))
        """
    )
