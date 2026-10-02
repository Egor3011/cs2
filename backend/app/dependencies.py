import secrets
from datetime import UTC, datetime
from functools import lru_cache

from fastapi import Header, HTTPException, status

from app.config import settings
from app.registration_repository import RegistrationRepository
from app.repository import TournamentRepository


def get_registration_now() -> datetime:
    return datetime.now(UTC)


@lru_cache
def get_tournament_repository() -> TournamentRepository:
    return TournamentRepository(settings.tournament_data_file)


@lru_cache
def get_registration_repository() -> RegistrationRepository:
    return RegistrationRepository(settings.registrations_data_file)


def require_admin_key(
    admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> None:
    # An unset key keeps local development convenient. Production deployments
    # should always define ADMIN_API_KEY.
    if settings.admin_api_key is None:
        return
    if admin_key is None or not secrets.compare_digest(admin_key, settings.admin_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin API key",
        )
