from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_registration_repository, require_admin_key
from app.models import Registration, RegistrationStatusPatch
from app.registration_repository import RegistrationDataError, RegistrationRepository

router = APIRouter(prefix="/api/admin/registrations", tags=["admin"], dependencies=[Depends(require_admin_key)])
Repository = Annotated[RegistrationRepository, Depends(get_registration_repository)]


@router.get("", response_model=list[Registration], response_model_by_alias=True)
def list_applications(repository: Repository) -> list[Registration]:
    try:
        return repository.get_all()
    except RegistrationDataError as exc:
        raise HTTPException(500, detail=str(exc)) from exc


@router.patch("/{registration_id}", response_model=Registration, response_model_by_alias=True)
def update_application(registration_id: str, patch: RegistrationStatusPatch, repository: Repository) -> Registration:
    try:
        registration = repository.update_status(registration_id, patch.status)
    except RegistrationDataError as exc:
        raise HTTPException(500, detail=str(exc)) from exc
    if registration is None:
        raise HTTPException(404, detail="Заявка не найдена")
    return registration
