"""Slot arithmetic: business hours minus booked appointments.

The pod clock is UTC; the studio clock is APP_TZ — anchor "today"/"now" here with
`today_iso()` and `datetime.now(APP_TZ)`, never with client-side date math.
"""

import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from lib.db import db
from lib.dates import today_iso

STEP_MIN = 30


def _tz() -> ZoneInfo:
    return ZoneInfo(os.environ.get("APP_TZ", "UTC"))


def _t(hhmm: str) -> datetime:
    return datetime.strptime(hhmm, "%H:%M")


def _weekday(date: str) -> int:
    return datetime.strptime(date, "%Y-%m-%d").weekday()


def valid_date(date: str) -> bool:
    try:
        datetime.strptime(date, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def gen_slots(open_time: str, close_time: str, duration_min: int, step_min: int = STEP_MIN) -> list[str]:
    """Start times (HH:MM) where the whole service fits before closing."""
    open_t, close_t = _t(open_time), _t(close_time)
    slots: list[str] = []
    cursor = open_t
    while cursor + timedelta(minutes=duration_min) <= close_t:
        slots.append(cursor.strftime("%H:%M"))
        cursor += timedelta(minutes=step_min)
    return slots


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


async def available_slots(
    studio_id: str, date: str, duration_min: int, professional_id: str | None = None
) -> list[str]:
    """Free start times for a date. With a professional_id, only that pro's calendar
    counts; otherwise a slot is free when at least one active pro is free."""
    hours = await db.business_hours.find_one({"studio_id": studio_id, "weekday": _weekday(date)})
    if not hours or hours.get("closed"):
        return []
    pros = await db.professionals.find({"studio_id": studio_id, "active": True}).sort("name", 1).to_list(100)
    if not pros:
        return []

    booked = await db.appointments.find(
        {"studio_id": studio_id, "date": date, "status": "confirmed"}
    ).to_list(500)
    busy: dict[str, list[tuple[datetime, datetime]]] = {p["id"]: [] for p in pros}
    for appt in booked:
        pid = appt.get("professional_id")
        if pid in busy:
            start = _t(appt["time"])
            end = start + timedelta(minutes=appt.get("duration_min", 60))
            busy[pid].append((start, end))

    now_time = datetime.now(_tz()).time() if date == today_iso() else None

    free_slots: list[str] = []
    for slot in gen_slots(hours["open_time"], hours["close_time"], duration_min):
        start = _t(slot)
        end = start + timedelta(minutes=duration_min)
        if now_time is not None and start.time() < now_time:
            continue

        def pro_free(pid: str) -> bool:
            return not any(_overlaps(start, end, bs, be) for bs, be in busy.get(pid, []))

        if professional_id:
            free = professional_id in busy and pro_free(professional_id)
        else:
            free = any(pro_free(p["id"]) for p in pros)
        if free:
            free_slots.append(slot)
    return free_slots


async def pick_professional(
    studio_id: str, date: str, time: str, duration_min: int
) -> str | None:
    """First (alphabetical) active professional free at the given slot — used when the
    customer books 'Qualquer disponível'."""
    start = _t(time)
    end = start + timedelta(minutes=duration_min)
    booked = await db.appointments.find(
        {"studio_id": studio_id, "date": date, "status": "confirmed"}
    ).to_list(500)
    taken: set[str] = set()
    for appt in booked:
        pid = appt.get("professional_id")
        if not pid:
            continue
        a_start = _t(appt["time"])
        a_end = a_start + timedelta(minutes=appt.get("duration_min", 60))
        if _overlaps(start, end, a_start, a_end):
            taken.add(pid)
    pros = await db.professionals.find({"studio_id": studio_id, "active": True}).sort("name", 1).to_list(100)
    for pro in pros:
        if pro["id"] not in taken:
            return pro["id"]
    return None


async def conflict_exists(
    studio_id: str, date: str, time: str, duration_min: int, professional_id: str
) -> bool:
    """Admin-side double-booking guard for a specific professional."""
    others = await db.appointments.find(
        {
            "studio_id": studio_id,
            "date": date,
            "status": "confirmed",
            "professional_id": professional_id,
        }
    ).to_list(200)
    start = _t(time)
    end = start + timedelta(minutes=duration_min)
    for appt in others:
        a_start = _t(appt["time"])
        a_end = a_start + timedelta(minutes=appt.get("duration_min", 60))
        if _overlaps(start, end, a_start, a_end):
            return True
    return False
