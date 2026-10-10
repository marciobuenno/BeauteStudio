"""Public, no-auth routes: studio catalog payload, free slots, customer booking."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from lib.dates import aware_doc, today_iso
from lib.db import db
from lib.scheduling import available_slots, pick_professional, valid_date
from lib.security import new_id
from models.appointment import AppointmentCreateIn, AppointmentOut
from models.public import PublicStudioOut

router = APIRouter(prefix="/public", tags=["public"])


async def _studio_or_404(slug: str) -> dict:
    studio = await db.studios.find_one({"slug": slug})
    if not studio:
        raise HTTPException(status_code=404, detail="Studio não encontrado")
    return studio


@router.get("/studios/{slug}", response_model=PublicStudioOut)
async def get_public_studio(slug: str):
    studio = await _studio_or_404(slug)
    services = (
        await db.services.find({"studio_id": studio["id"], "active": True})
        .sort([("sort_order", 1), ("created_at", 1)])
        .to_list(500)
    )
    professionals = (
        await db.professionals.find({"studio_id": studio["id"], "active": True})
        .sort("name", 1)
        .to_list(100)
    )
    hours = await db.business_hours.find({"studio_id": studio["id"]}).sort("weekday", 1).to_list(7)

    categories: list[str] = []
    for service in services:
        if service["category"] not in categories:
            categories.append(service["category"])

    return PublicStudioOut(
        id=studio["id"],
        name=studio["name"],
        slug=studio["slug"],
        tagline=studio.get("tagline", ""),
        about=studio.get("about", ""),
        phone=studio.get("phone", ""),
        address=studio.get("address", ""),
        today=today_iso(),
        categories=categories,
        services=services,
        professionals=professionals,
        hours=hours,
    )


@router.get("/studios/{slug}/slots", response_model=list[str])
async def get_slots(slug: str, date: str, service_id: str, professional_id: str | None = None):
    studio = await _studio_or_404(slug)
    if not valid_date(date):
        raise HTTPException(status_code=422, detail="Data inválida")
    service = await db.services.find_one({"id": service_id, "studio_id": studio["id"], "active": True})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço indisponível")
    pro_id = None if professional_id in (None, "", "any") else professional_id
    if pro_id:
        pro = await db.professionals.find_one({"id": pro_id, "studio_id": studio["id"], "active": True})
        if not pro:
            raise HTTPException(status_code=404, detail="Profissional indisponível")
    return await available_slots(studio["id"], date, service["duration_min"], pro_id)


@router.post("/studios/{slug}/appointments", response_model=AppointmentOut, status_code=201)
async def book(slug: str, input: AppointmentCreateIn):
    studio = await _studio_or_404(slug)
    if not valid_date(input.date):
        raise HTTPException(status_code=422, detail="Data inválida")
    service = await db.services.find_one({"id": input.service_id, "studio_id": studio["id"], "active": True})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço indisponível")

    pro_id = input.professional_id
    if pro_id:
        pro = await db.professionals.find_one({"id": pro_id, "studio_id": studio["id"], "active": True})
        if not pro:
            raise HTTPException(status_code=404, detail="Profissional indisponível")

    slots = await available_slots(studio["id"], input.date, service["duration_min"], pro_id)
    if input.time not in slots:
        raise HTTPException(status_code=409, detail="Este horário não está mais disponível")

    if not pro_id:
        pro_id = await pick_professional(studio["id"], input.date, input.time, service["duration_min"])
        if not pro_id:
            raise HTTPException(status_code=409, detail="Nenhum profissional disponível neste horário")
    professional = await db.professionals.find_one({"id": pro_id})

    doc = {
        "id": new_id(),
        "studio_id": studio["id"],
        "service_id": service["id"],
        "service_name": service["name"],
        "professional_id": pro_id,
        "professional_name": professional["name"] if professional else None,
        "date": input.date,
        "time": input.time,
        "duration_min": service["duration_min"],
        "price_cents": service["price_cents"],
        "customer_name": input.customer_name.strip(),
        "customer_phone": input.customer_phone.strip(),
        "notes": input.notes.strip(),
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc),
    }
    await db.appointments.insert_one(doc)
    return AppointmentOut(**aware_doc(doc))
