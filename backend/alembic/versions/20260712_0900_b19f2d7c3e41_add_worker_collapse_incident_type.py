"""Add worker_collapse incident type support.

Revision ID: b19f2d7c3e41
Revises: ae2ae7dbbde7
Create Date: 2026-07-12 09:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b19f2d7c3e41"
down_revision: Union[str, None] = "ae2ae7dbbde7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Allow WORKER_COLLAPSE in incidents.incident_type CHECK constraint."""
    op.execute("ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidenttype")
    op.execute(
        """
        ALTER TABLE incidents
        ADD CONSTRAINT incidenttype
        CHECK (incident_type IN ('GAS_LEAK', 'FIRE', 'EXPLOSION', 'PPE_VIOLATION', 'EMERGENCY_RESPONSE', 'WORKER_COLLAPSE'))
        """
    )


def downgrade() -> None:
    """Remove WORKER_COLLAPSE from incidents.incident_type CHECK constraint."""
    op.execute("DELETE FROM incidents WHERE incident_type = 'WORKER_COLLAPSE'")
    op.execute("ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidenttype")
    op.execute(
        """
        ALTER TABLE incidents
        ADD CONSTRAINT incidenttype
        CHECK (incident_type IN ('GAS_LEAK', 'FIRE', 'EXPLOSION', 'PPE_VIOLATION', 'EMERGENCY_RESPONSE'))
        """
    )
