"""Studio profile + plan models — mirrored by hand in frontend/src/types.ts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StudioOut(BaseModel):
    id: str
    name: str
    slug: str
    tagline: str
    phone: str
    address: str
    about: str
    plan: str
    plan_expires_at: datetime | None = None
    created_at: datetime


class StudioUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    tagline: str | None = Field(default=None, max_length=140)
    phone: str | None = Field(default=None, max_length=25)
    address: str | None = Field(default=None, max_length=200)
    about: str | None = Field(default=None, max_length=2000)


class PlanIn(BaseModel):
    plan: Literal["trial", "active"]
    months: int = Field(default=1, ge=1, le=24)
