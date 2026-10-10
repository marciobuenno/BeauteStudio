"""Appointment models — mirrored by hand in frontend/src/types.ts."""

from datetime import datetime

from pydantic import BaseModel, Field

from models.hours import TIME_PATTERN

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class AppointmentCreateIn(BaseModel):
    service_id: str
    professional_id: str | None = None
    date: str = Field(pattern=DATE_PATTERN)
    time: str = Field(pattern=TIME_PATTERN)
    customer_name: str = Field(min_length=2, max_length=80)
    customer_phone: str = Field(min_length=8, max_length=20)
    notes: str = Field(default="", max_length=500)


class AppointmentStatusUpdate(BaseModel):
    status: str = Field(pattern="^(confirmed|cancelled|completed)$")


class AppointmentOut(BaseModel):
    id: str
    studio_id: str
    service_id: str
    service_name: str
    professional_id: str | None
    professional_name: str | None
    date: str
    time: str
    duration_min: int
    price_cents: int
    customer_name: str
    customer_phone: str
    notes: str
    status: str
    created_at: datetime


class MetricsOut(BaseModel):
    today: str
    today_count: int
    today_revenue_cents: int
    week_count: int
    month_revenue_cents: int
    month_count: int
    month_customers: int
    today_appointments: list[AppointmentOut]
