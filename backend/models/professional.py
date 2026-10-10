"""Professional models — mirrored by hand in frontend/src/types.ts."""

from datetime import datetime

from pydantic import BaseModel, Field


class ProfessionalIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    specialty: str = Field(default="", max_length=80)
    bio: str = Field(default="", max_length=400)
    image_url: str = Field(default="", max_length=500)


class ProfessionalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    specialty: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=400)
    image_url: str | None = Field(default=None, max_length=500)
    active: bool | None = None


class ProfessionalOut(BaseModel):
    id: str
    studio_id: str
    name: str
    specialty: str
    bio: str
    image_url: str
    active: bool
    created_at: datetime
