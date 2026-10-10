"""Service models — mirrored by hand in frontend/src/types.ts."""

from datetime import datetime

from pydantic import BaseModel, Field


class ServiceIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    category: str = Field(min_length=2, max_length=60)
    description: str = Field(default="", max_length=600)
    price_cents: int = Field(ge=0, le=100_000_000)
    duration_min: int = Field(ge=5, le=480)
    image_url: str = Field(default="", max_length=500)


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    category: str | None = Field(default=None, min_length=2, max_length=60)
    description: str | None = Field(default=None, max_length=600)
    price_cents: int | None = Field(default=None, ge=0, le=100_000_000)
    duration_min: int | None = Field(default=None, ge=5, le=480)
    image_url: str | None = Field(default=None, max_length=500)
    active: bool | None = None


class ServiceOut(BaseModel):
    id: str
    studio_id: str
    name: str
    category: str
    description: str
    price_cents: int
    duration_min: int
    image_url: str
    active: bool
    created_at: datetime
