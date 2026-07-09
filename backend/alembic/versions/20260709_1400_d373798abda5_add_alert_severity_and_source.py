"""Add severity and source columns to alerts.

Revision ID: d373798abda5
Revises: 9c3c7e3d4a5b
Create Date: 2026-07-09 14:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d373798abda5"
down_revision: Union[str, None] = "9c3c7e3d4a5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add alerts.severity and alerts.source with backfilled defaults."""
    op.add_column(
        "alerts",
        sa.Column(
            "severity",
            sa.Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="alertseverity", native_enum=False, length=20),
            nullable=False,
            server_default="MEDIUM",
        ),
    )
    op.add_column(
        "alerts",
        sa.Column(
            "source",
            sa.Enum(
                "SENSOR_MONITORING",
                "PERMIT_VALIDATION",
                "WORKER_MONITORING",
                name="alertsource",
                native_enum=False,
                length=30,
            ),
            nullable=False,
            server_default="SENSOR_MONITORING",
        ),
    )
    op.create_index("ix_alerts_severity", "alerts", ["severity"], unique=False)
    op.create_index("ix_alerts_source", "alerts", ["source"], unique=False)


def downgrade() -> None:
    """Remove alerts.severity and alerts.source."""
    op.drop_index("ix_alerts_source", table_name="alerts")
    op.drop_index("ix_alerts_severity", table_name="alerts")
    op.drop_column("alerts", "source")
    op.drop_column("alerts", "severity")
