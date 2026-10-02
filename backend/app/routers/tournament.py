from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_tournament_repository
from app.models import Tournament
from app.repository import TournamentDataError, TournamentRepository


router = APIRouter(prefix="/api/tournament", tags=["tournament"])
Repository = Annotated[TournamentRepository, Depends(get_tournament_repository)]


@router.get(
    "",
    response_model=Tournament,
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
def get_tournament(repository: Repository) -> Tournament:
    """Return current tournament data for the frontend."""
    try:
        return repository.get()
    except TournamentDataError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
