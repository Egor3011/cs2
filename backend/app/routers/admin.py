from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError

from app.dependencies import get_tournament_repository, require_admin_key
from app.models import Tournament, TournamentPatch, UpdateResponse
from app.repository import TournamentDataError, TournamentRepository


router = APIRouter(
    prefix="/api/admin/tournament",
    tags=["admin"],
    dependencies=[Depends(require_admin_key)],
)
Repository = Annotated[TournamentRepository, Depends(get_tournament_repository)]


def _storage_error(exc: TournamentDataError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=str(exc),
    )


@router.get(
    "",
    response_model=Tournament,
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
def get_tournament_for_admin(repository: Repository) -> Tournament:
    try:
        return repository.get()
    except TournamentDataError as exc:
        raise _storage_error(exc) from exc


@router.put(
    "",
    response_model=UpdateResponse,
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
def replace_tournament(tournament: Tournament, repository: Repository) -> UpdateResponse:
    """Replace the complete tournament document."""
    try:
        updated = repository.replace(tournament)
        return UpdateResponse(message="Tournament updated", tournament=updated)
    except TournamentDataError as exc:
        raise _storage_error(exc) from exc


@router.patch(
    "",
    response_model=UpdateResponse,
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
def patch_tournament(patch: TournamentPatch, repository: Repository) -> UpdateResponse:
    """Update only the supplied top-level tournament fields."""
    if not patch.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request body must contain at least one field",
        )

    try:
        updated = repository.patch(patch)
        return UpdateResponse(message="Tournament updated", tournament=updated)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(include_context=False),
        ) from exc
    except TournamentDataError as exc:
        raise _storage_error(exc) from exc
