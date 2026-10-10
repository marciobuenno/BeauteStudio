"""Financial reporting (owner-authenticated): revenue by service, professional and month."""

from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_studio
from lib.dates import today_iso
from lib.db import db
from lib.scheduling import valid_date
from models.report import MonthPoint, ReportOut, RevenueSlice

router = APIRouter(prefix="/reports", tags=["reports"])

MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

# Revenue counts appointments that happened or are booked — cancellations are tracked separately.
EARNING_STATUSES = ("confirmed", "completed")


def month_label(month: str) -> str:
    year, mon = month.split("-")
    return f"{MONTHS_PT[int(mon) - 1]}/{year[2:]}"


def _slices(bucket: dict[str, dict]) -> list[RevenueSlice]:
    rows = [
        RevenueSlice(label=label, revenue_cents=agg["revenue"], count=agg["count"])
        for label, agg in bucket.items()
    ]
    return sorted(rows, key=lambda r: r.revenue_cents, reverse=True)


@router.get("/revenue", response_model=ReportOut)
async def revenue(start: str | None = None, end: str | None = None, studio: dict = Depends(require_studio)):
    """Defaults to the last 6 months through the end of the current month, so bookings
    already on the agenda for the coming days count as expected revenue."""
    if not end:
        today = datetime.strptime(today_iso(), "%Y-%m-%d")
        next_month = today.replace(day=28) + timedelta(days=4)
        end = (next_month.replace(day=1) - timedelta(days=1)).strftime("%Y-%m-%d")
    if not start:
        start = (datetime.strptime(end, "%Y-%m-%d") - timedelta(days=180)).strftime("%Y-%m-%d")
    if not valid_date(start) or not valid_date(end):
        raise HTTPException(status_code=422, detail="Período inválido")
    if start > end:
        raise HTTPException(status_code=422, detail="A data inicial deve ser antes da data final")

    docs = await db.appointments.find(
        {"studio_id": studio["id"], "date": {"$gte": start, "$lte": end}}
    ).to_list(5000)

    by_service: dict[str, dict] = defaultdict(lambda: {"revenue": 0, "count": 0})
    by_professional: dict[str, dict] = defaultdict(lambda: {"revenue": 0, "count": 0})
    by_month: dict[str, dict] = defaultdict(lambda: {"revenue": 0, "count": 0})
    customers: set[str] = set()
    total_revenue = 0
    total_count = 0
    cancelled = 0

    for appt in docs:
        if appt.get("status") == "cancelled":
            cancelled += 1
            continue
        if appt.get("status") not in EARNING_STATUSES:
            continue
        price = appt.get("price_cents", 0)
        total_revenue += price
        total_count += 1
        customers.add(appt.get("customer_phone", ""))

        service = appt.get("service_name") or "Sem serviço"
        by_service[service]["revenue"] += price
        by_service[service]["count"] += 1

        professional = appt.get("professional_name") or "A definir"
        by_professional[professional]["revenue"] += price
        by_professional[professional]["count"] += 1

        month = appt["date"][:7]
        by_month[month]["revenue"] += price
        by_month[month]["count"] += 1

    return ReportOut(
        start=start,
        end=end,
        total_revenue_cents=total_revenue,
        total_count=total_count,
        cancelled_count=cancelled,
        avg_ticket_cents=round(total_revenue / total_count) if total_count else 0,
        customers=len(customers),
        by_service=_slices(by_service),
        by_professional=_slices(by_professional),
        by_month=[
            MonthPoint(
                month=month,
                label=month_label(month),
                revenue_cents=agg["revenue"],
                count=agg["count"],
            )
            for month, agg in sorted(by_month.items())
        ],
    )
