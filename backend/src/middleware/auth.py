"""
JWT authentication and role-authorization dependencies for SafeFusion AI.

``get_current_user`` is the single enforcement point for authentication —
include it on any router that must require a valid access token. It
resolves the bearer token via FastAPI's ``HTTPBearer`` scheme, decodes
and validates it, and loads the corresponding active user from the
database.

``require_role`` builds on top of it to additionally enforce
authorization (403) once authentication (401) has already passed.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.models.enums import UserRole
from src.models.user import User
from src.repositories.user import UserRepository
from src.utils.security import TokenError, TokenType, decode_token

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Resolve and validate the requesting user from the ``Authorization`` header.

    Raises:
        HTTPException: 401 if the header is missing, the token is invalid/expired,
            or the token subject does not map to an active user.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials, expected_type=TokenType.ACCESS)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists or is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def require_role(*allowed_roles: UserRole):
    """Build a dependency that additionally enforces the caller holds one of ``allowed_roles``.

    Must be combined with (or used after) authentication — a caller who
    fails authentication gets 401 from :func:`get_current_user` before
    this check ever runs; a caller who authenticates but holds the wrong
    role gets 403 here.
    """

    def _check_role(current_user: CurrentUserDep) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return _check_role
