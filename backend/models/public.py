"""Public (no-auth) response models — mirrored by hand in frontend/src/types.ts."""

from pydantic import BaseModel

from models.hours import HoursOut
from models.professional import ProfessionalOut
from models.service import ServiceOut


class PublicStudioOut(BaseModel):
    id: str
    name: str
    slug: str
    tagline: str
    about: str
    phone: str
    address: str
    today: str
    categories: list[str]
    services: list[ServiceOut]
    professionals: list[ProfessionalOut]
    hours: list[HoursOut]
