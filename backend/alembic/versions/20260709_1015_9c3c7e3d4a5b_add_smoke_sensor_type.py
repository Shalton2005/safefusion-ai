"""Add smoke sensor type support.

Revision ID: 9c3c7e3d4a5b
Revises: fb7da06618a2
Create Date: 2026-07-09 10:15:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "9c3c7e3d4a5b"
down_revision: Union[str, None] = "fb7da06618a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Allow SMOKE in sensors.sensor_type CHECK constraint."""
    op.execute("ALTER TABLE sensors DROP CONSTRAINT IF EXISTS sensortype")
    op.execute(
        """
        ALTER TABLE sensors
        ADD CONSTRAINT sensortype
        CHECK (sensor_type IN ('GAS', 'TEMPERATURE', 'PRESSURE', 'HUMIDITY', 'SMOKE'))
        """
    )


def downgrade() -> None:
    """Remove SMOKE from sensors.sensor_type CHECK constraint."""
    op.execute("DELETE FROM sensors WHERE sensor_type = 'SMOKE'")
    op.execute("ALTER TABLE sensors DROP CONSTRAINT IF EXISTS sensortype")
    op.execute(
        """
        ALTER TABLE sensors
        ADD CONSTRAINT sensortype
        CHECK (sensor_type IN ('GAS', 'TEMPERATURE', 'PRESSURE', 'HUMIDITY'))
        """
    )