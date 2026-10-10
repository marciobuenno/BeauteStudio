"""Financial report models — mirrored by hand in frontend/src/types.ts."""

from pydantic import BaseModel


class RevenueSlice(BaseModel):
    """One row of a breakdown (by service or by professional)."""

    label: str
    revenue_cents: int
    count: int


class MonthPoint(BaseModel):
    month: str  # "YYYY-MM"
    label: str  # "out/26"
    revenue_cents: int
    count: int


class ReportOut(BaseModel):
    start: str
    end: str
    total_revenue_cents: int
    total_count: int
    cancelled_count: int
    avg_ticket_cents: int
    customers: int
    by_service: list[RevenueSlice]
    by_professional: list[RevenueSlice]
    by_month: list[MonthPoint]
