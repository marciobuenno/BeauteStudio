"""Appointments (owner-authenticated): agenda listing, manual booking, status changes, metrics."""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import os

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_studio
from lib.dates import aware_doc, today_iso
from lib.db import db
from lib.scheduling import conflict_exists, valid_date
from lib.security import new_id
from models.appointment import (
    AppointmentCreateIn,
    AppointmentOut,
    AppointmentStatusUpdate,
    MetricsOut,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])

APPT_FIELDS = (
    "id",
    "studio_id",
    "service_id",
    "service_name",
    "professional_id",
    "professional_name",
    "date",
    "time",
    "duration_min",
    "price_cents",
    "customer_name",
    "customer_phone",
    "notes",
    "status",
    "created_at",
)


def appt_out(doc: dict) -> AppointmentOut:
    return AppointmentOut(**{k: aware_doc(doc)[k] for k in APPT_FIELDS})


def _tz():
    return ZoneInfo(os.environ.get("APP_TZ", "UTC"))


@router.get("/metrics", response_model=MetricsOut)
async def metrics(studio: dict = Depends(require_studio)):
    sid = studio["id"]
    today = today_iso()
    month = today[:7]
    week_end = (datetime.now(_tz()) + timedelta(days=7)).strftime("%Y-%m-%d")

    today_apps = (
        await db.appointments.find({"studio_id": sid, "date": today, "status": "confirmed"})
        .sort("time", 1)
        .to_list(200)
    )
    month_apps = await db.appointments.find(
        {
            "studio_id": sid,
            "date": {"$gte": f"{month}-01", "$lte": f"{month}-31"},
            "status": {"$in": ["confirmed", "completed"]},
        }
    ).to_list(2000)
    week_count = await db.appointments.count_documents(
        {"studio_id": sid, "date": {"$gte": today, "$lte": week_end}, "status": "confirmed"}
    )

    return MetricsOut(
        today=today,
        today_count=len(today_apps),
        today_revenue_cents=sum(a.get("price_cents", 0) for a in today_apps),
        week_count=week_count,
        month_revenue_cents=sum(a.get("price_cents", 0) for a in month_apps),
        month_count=len(month_apps),
        month_customers=len({a.get("customer_phone", "") for a in month_apps}),
        today_appointments=[appt_out(a) for a in today_apps],
    )


@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    scope: str = "all", status: str | None = None, studio: dict = Depends(require_studio)
):
    query: dict = {"studio_id": studio["id"]}
    if scope == "today":
        query["date"] = today_iso()
    elif scope == "upcoming":
        query["date"] = {"$gt": today_iso()}

    if status:
        query["status"] = status

    sort = [("date", 1), ("time", 1)] if scope in ("today", "upcoming") else [("date", -1), ("time", -1)]
    docs = await db.appointments.find(query).sort(sort).to_list(300)
    return [appt_out(d) for d in docs]


@router.post("", response_model=AppointmentOut, status_code=201)
async def create_appointment(input: AppointmentCreateIn, studio: dict = Depends(require_studio)):
    if not valid_date(input.date):
        raise HTTPException(status_code=422, detail="Data inválida")
    service = await db.services.find_one({"id": input.service_id, "studio_id": studio["id"]})
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")

    professional = None
    if input.professional_id:
        professional = await db.professionals.find_one(
            {"id": input.professional_id, "studio_id": studio["id"], "active": True}
        )
        if not professional:
            raise HTTPException(status_code=404, detail="Profissional não encontrado")
        if await conflict_exists(
            studio["id"], input.date, input.time, service["duration_min"], input.professional_id
        ):
            raise HTTPException(
                status_code=409,
                detail="Esse profissional já tem um atendimento neste horário",
            )

    doc = {
        "id": new_id(),
        "studio_id": studio["id"],
        "service_id": service["id"],
        "service_name": service["name"],
        "professional_id": professional["id"] if professional else None,
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
    return appt_out(doc)


async def _own_appointment(studio_id: str, appointment_id: str) -> dict:
    doc = await db.appointments.find_one({"id": appointment_id, "studio_id": studio_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    return doc


@router.patch("/{appointment_id}", response_model=AppointmentOut)
async def update_appointment_status(
    appointment_id: str, input: AppointmentStatusUpdate, studio: dict = Depends(require_studio)
):
    await _own_appointment(studio["id"], appointment_id)
    await db.appointments.update_one({"id": appointment_id}, {"$set": {"status": input.status}})
    return appt_out(await db.appointments.find_one({"id": appointment_id}))
