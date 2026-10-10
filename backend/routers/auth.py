"""Auth routes: studio registration, login, me, logout — all under /api/auth/*."""

import re
import unicodedata
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import SESSION_COOKIE, create_session, require_studio
from lib.dates import aware, today_iso
from lib.db import db
from lib.security import hash_password, new_id, verify_password
from models.auth import LoginIn, MeOut, RegisterIn

router = APIRouter(prefix="/auth", tags=["auth"])


def slugify(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return slug or "studio"


async def unique_slug(base: str) -> str:
    slug, i = base, 2
    while await db.studios.find_one({"slug": slug}):
        slug = f"{base}-{i}"
        i += 1
    return slug


def me_out(studio: dict) -> MeOut:
    return MeOut(
        studio_id=studio["id"],
        studio_name=studio["name"],
        slug=studio["slug"],
        owner_name=studio.get("owner_name", ""),
        email=studio.get("email", ""),
        phone=studio.get("phone", ""),
        plan=studio.get("plan", "trial"),
        plan_expires_at=aware(studio.get("plan_expires_at")),
        today=today_iso(),
    )


def default_hours(studio_id: str) -> list[dict]:
    return [
        {
            "id": new_id(),
            "studio_id": studio_id,
            "weekday": weekday,
            "open_time": "09:00",
            "close_time": "19:00",
            "closed": weekday == 6,
        }
        for weekday in range(7)
    ]


@router.post("/register", response_model=MeOut, status_code=201)
async def register(input: RegisterIn, response: Response):
    email = input.email.lower()
    if await db.studios.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Este e-mail já possui um studio cadastrado")
    now = datetime.now(timezone.utc)
    studio = {
        "id": new_id(),
        "name": input.studio_name.strip(),
        "slug": await unique_slug(slugify(input.studio_name)),
        "owner_name": input.owner_name.strip(),
        "email": email,
        "phone": input.phone.strip(),
        "tagline": "Sua melhor versão, todos os dias.",
        "about": "",
        "address": "",
        "plan": "trial",
        "plan_expires_at": now + timedelta(days=14),
        "password_hash": hash_password(input.password),
        "created_at": now,
    }
    await db.studios.insert_one(studio)
    await db.business_hours.insert_many(default_hours(studio["id"]))
    await create_session(response, studio["id"])
    return me_out(studio)


@router.post("/login", response_model=MeOut)
async def login(input: LoginIn, response: Response):
    studio = await db.studios.find_one({"email": input.email.lower()})
    if not studio or not verify_password(input.password, studio.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    await create_session(response, studio["id"])
    return me_out(studio)


@router.get("/me", response_model=MeOut)
async def me(studio: dict = Depends(require_studio)):
    return me_out(studio)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await db.sessions.delete_one({"id": token})
    response.delete_cookie(SESSION_COOKIE, path="/")
    return None
