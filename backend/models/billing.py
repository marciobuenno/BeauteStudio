"""Mercado Pago Pix billing models — mirrored by hand in frontend/src/types.ts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class PixChargeIn(BaseModel):
    plan: Literal["monthly", "annual"]
    payer_first_name: str = Field(min_length=2, max_length=80)
    payer_last_name: str = Field(min_length=1, max_length=80)
    payer_email: EmailStr
    cpf: str = Field(min_length=11, max_length=14)


class PixChargeOut(BaseModel):
    payment_id: str
    status: str
    plan: str
    amount_cents: int
    qr_code: str | None = None
    qr_code_base64: str | None = None
    ticket_url: str | None = None
    created_at: datetime


class PixStatusOut(BaseModel):
    payment_id: str
    status: str
    approved: bool
    plan: str
    amount_cents: int
    plan_expires_at: datetime | None = None


class BillingConfigOut(BaseModel):
    """Lets the UI explain itself when the Mercado Pago token is not configured yet."""

    enabled: bool
    monthly_cents: int
    annual_cents: int
