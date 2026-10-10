"""Business-hours models — mirrored by hand in frontend/src/types.ts."""

from pydantic import BaseModel, Field

TIME_PATTERN = r"^\d{2}:\d{2}$"


class HoursEntryIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    open_time: str = Field(pattern=TIME_PATTERN)
    close_time: str = Field(pattern=TIME_PATTERN)
    closed: bool = False


class HoursIn(BaseModel):
    entries: list[HoursEntryIn] = Field(min_length=7, max_length=7)


class HoursOut(BaseModel):
    id: str
    studio_id: str
    weekday: int
    open_time: str
    close_time: str
    closed: bool
