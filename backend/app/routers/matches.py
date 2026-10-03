from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_tournament_repository
from app.models import MatchResponse
from app.repository import TournamentDataError, TournamentRepository


router = APIRouter(prefix="/api/matches", tags=["matches"])
Repository = Annotated[TournamentRepository, Depends(get_tournament_repository)]


@router.get(
    "/{match_id}",
    response_model=MatchResponse,
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
def get_match(match_id: str, repository: Repository) -> MatchResponse:
    """Return match details and the tournament needed to display its bracket."""
    try:
        tournament = repository.get()
    except TournamentDataError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    match = tournament.matches.get(match_id)
    if match is None or match.hidden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )
    return MatchResponse(tournament=tournament, match=match)
