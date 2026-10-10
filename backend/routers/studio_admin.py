"""Studio profile, plan and business-hours routes (owner-authenticated)."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_studio
from lib.db import db
from lib.scheduling import _t
from lib.security import new_id
from lib.dates import aware_doc
from models.hours import HoursIn, HoursOut
from models.studio import PlanIn, StudioOut, StudioUpdate

router = APIRouter(prefix="/studio", tags=["studio"])


def studio_out(doc: dict) -> StudioOut:
    return StudioOut(**aware_doc(doc))


@router.get("/me", response_model=StudioOut)
async def get_studio(studio: dict = Depends(require_studio)):
    return studio_out(studio)


@router.patch("/me", response_model=StudioOut)
async def update_studio(input: StudioUpdate, studio: dict = Depends(require_studio)):
    updates = {k: v for k, v in input.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.studios.update_one({"id": studio["id"]}, {"$set": updates})
    return studio_out(await db.studios.find_one({"id": studio["id"]}))


@router.post("/plan", response_model=StudioOut)
async def set_plan(input: PlanIn, studio: dict = Depends(require_studio)):
    """Mocked subscription activation — payment gateway comes in a later phase."""
    now = datetime.now(timezone.utc)
    if input.plan == "active":
        expires = now + timedelta(days=30 * input.months)
    else:
        expires = now + timedelta(days=14)
    await db.studios.update_one(
        {"id": studio["id"]}, {"$set": {"plan": input.plan, "plan_expires_at": expires}}
    )
    return studio_out(await db.studios.find_one({"id": studio["id"]}))


@router.get("/hours", response_model=list[HoursOut])
async def get_hours(studio: dict = Depends(require_studio)):
    docs = await db.business_hours.find({"studio_id": studio["id"]}).sort("weekday", 1).to_list(7)
    return [HoursOut(**aware_doc(d)) for d in docs]


@router.put("/hours", response_model=list[HoursOut])
async def put_hours(input: HoursIn, studio: dict = Depends(require_studio)):
    seen: set[int] = set()
    for entry in input.entries:
        if entry.weekday in seen:
            raise HTTPException(status_code=422, detail="Dia da semana duplicado no formulário")
        seen.add(entry.weekday)
        if not entry.closed and _t(entry.open_time) >= _t(entry.close_time):
            raise HTTPException(
                status_code=422,
                detail=f"Horário inválido em {entry.weekday}: abertura deve ser antes do fechamento",
            )
        await db.business_hours.update_one(
            {"studio_id": studio["id"], "weekday": entry.weekday},
            {
                "$set": {"open_time": entry.open_time, "close_time": entry.close_time, "closed": entry.closed},
                "$setOnInsert": {"id": new_id(), "studio_id": studio["id"], "weekday": entry.weekday},
            },
            upsert=True,
        )
    docs = await db.business_hours.find({"studio_id": studio["id"]}).sort("weekday", 1).to_list(7)
    return [HoursOut(**aware_doc(d)) for d in docs]
