from typing import Annotated
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_registration_now, get_registration_repository, get_tournament_repository
from app.models import PublicRegistration, RegistrationCreate, RegistrationResponse
from app.registration_repository import RegistrationDataError, RegistrationRepository
from app.repository import TournamentDataError, TournamentRepository


router = APIRouter(prefix="/api/registrations", tags=["registrations"])
Repository = Annotated[RegistrationRepository, Depends(get_registration_repository)]
TournamentStore = Annotated[TournamentRepository, Depends(get_tournament_repository)]
RegistrationClock = Annotated[datetime, Depends(get_registration_now)]


@router.get("", response_model=list[PublicRegistration], response_model_by_alias=True)
def list_registrations(repository: Repository) -> list[PublicRegistration]:
    """Return public team application data without captain contacts."""
    try:
        return [
            PublicRegistration.model_validate(registration, from_attributes=True)
            for registration in repository.get_all()
        ]
    except RegistrationDataError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.post("", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
def create_registration(
    registration: RegistrationCreate,
    repository: Repository,
    tournament_repository: TournamentStore,
    now: RegistrationClock,
) -> RegistrationResponse:
    """Register a team for the current tournament."""
    try:
        terms = tournament_repository.get().terms
        if terms and now >= terms.registration_closes_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Регистрация завершена. Новые заявки не принимаются.",
            )
        stored = repository.create(registration)
        return RegistrationResponse(message="Registration accepted", registration=stored)
    except (RegistrationDataError, TournamentDataError) as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
