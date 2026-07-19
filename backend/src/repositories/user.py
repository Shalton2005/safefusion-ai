"""
User repository for SafeFusion AI.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.user import User
from src.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Data-access layer for the User aggregate."""

    def __init__(self, db: Session) -> None:
        super().__init__(User, db)

    def get_by_email(self, email: str) -> User | None:
        """Return the user matching the given email address, or ``None``."""
        return self._db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()
