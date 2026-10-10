"""Auth boundary models — mirrored by hand in frontend/src/types.ts."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from lib.dates import today_iso


class RegisterIn(BaseModel):
    studio_name: str = Field(min_length=2, max_length=80)
    owner_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    phone: str = Field(default="", max_length=25)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MeOut(BaseModel):
    studio_id: str
    studio_name: str
    slug: str
    owner_name: str
    email: str
    phone: str
    plan: str
    plan_expires_at: datetime | None = None
    today: str = Field(default_factory=today_iso)
