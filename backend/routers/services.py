"""Services CRUD (owner-authenticated)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_studio
from lib.db import db
from lib.dates import aware_doc
from lib.security import new_id
from models.service import ServiceIn, ServiceOut, ServiceUpdate

router = APIRouter(prefix="/services", tags=["services"])


def service_out(doc: dict) -> ServiceOut:
    return ServiceOut(**aware_doc(doc))


@router.get("", response_model=list[ServiceOut])
async def list_services(studio: dict = Depends(require_studio)):
    docs = (
        await db.services.find({"studio_id": studio["id"]})
        .sort([("sort_order", 1), ("created_at", 1)])
        .to_list(500)
    )
    return [service_out(d) for d in docs]


@router.post("", response_model=ServiceOut, status_code=201)
async def create_service(input: ServiceIn, studio: dict = Depends(require_studio)):
    count = await db.services.count_documents({"studio_id": studio["id"]})
    doc = {
        **input.model_dump(),
        "id": new_id(),
        "studio_id": studio["id"],
        "active": True,
        "sort_order": count,
        "created_at": datetime.now(timezone.utc),
    }
    await db.services.insert_one(doc)
    return service_out(doc)


async def _own_service(studio_id: str, service_id: str) -> dict:
    doc = await db.services.find_one({"id": service_id, "studio_id": studio_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    return doc


@router.patch("/{service_id}", response_model=ServiceOut)
async def update_service(service_id: str, input: ServiceUpdate, studio: dict = Depends(require_studio)):
    await _own_service(studio["id"], service_id)
    updates = {k: v for k, v in input.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.services.update_one({"id": service_id}, {"$set": updates})
    return service_out(await db.services.find_one({"id": service_id}))


@router.delete("/{service_id}", status_code=204)
async def delete_service(service_id: str, studio: dict = Depends(require_studio)):
    await _own_service(studio["id"], service_id)
    await db.services.delete_one({"id": service_id})
    return None
