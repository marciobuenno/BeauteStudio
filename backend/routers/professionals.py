"""Professionals CRUD (owner-authenticated)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_studio
from lib.db import db
from lib.dates import aware_doc
from lib.security import new_id
from models.professional import ProfessionalIn, ProfessionalOut, ProfessionalUpdate

router = APIRouter(prefix="/professionals", tags=["professionals"])


def professional_out(doc: dict) -> ProfessionalOut:
    return ProfessionalOut(**aware_doc(doc))


@router.get("", response_model=list[ProfessionalOut])
async def list_professionals(studio: dict = Depends(require_studio)):
    docs = (
        await db.professionals.find({"studio_id": studio["id"]})
        .sort([("active", -1), ("name", 1)])
        .to_list(200)
    )
    return [professional_out(d) for d in docs]


@router.post("", response_model=ProfessionalOut, status_code=201)
async def create_professional(input: ProfessionalIn, studio: dict = Depends(require_studio)):
    doc = {
        **input.model_dump(),
        "id": new_id(),
        "studio_id": studio["id"],
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.professionals.insert_one(doc)
    return professional_out(doc)


async def _own_professional(studio_id: str, professional_id: str) -> dict:
    doc = await db.professionals.find_one({"id": professional_id, "studio_id": studio_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")
    return doc


@router.patch("/{professional_id}", response_model=ProfessionalOut)
async def update_professional(
    professional_id: str, input: ProfessionalUpdate, studio: dict = Depends(require_studio)
):
    await _own_professional(studio["id"], professional_id)
    updates = {k: v for k, v in input.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.professionals.update_one({"id": professional_id}, {"$set": updates})
    return professional_out(await db.professionals.find_one({"id": professional_id}))


@router.delete("/{professional_id}", status_code=204)
async def delete_professional(professional_id: str, studio: dict = Depends(require_studio)):
    await _own_professional(studio["id"], professional_id)
    await db.professionals.delete_one({"id": professional_id})
    return None
