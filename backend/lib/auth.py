"""Session auth: the backend owns an httpOnly cookie; sessions live in Mongo.

`require_studio` is the FastAPI dependency every admin route uses — it resolves the
session cookie to the studio document or raises 401.
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response

from lib.db import db
from lib.security import new_token

SESSION_COOKIE = "beaute_session"
SESSION_TTL_DAYS = 30


async def create_session(response: Response, studio_id: str) -> None:
    token = new_token()
    now = datetime.now(timezone.utc)
    await db.sessions.insert_one(
        {
            "id": token,
            "studio_id": studio_id,
            "created_at": now,
            "expires_at": now + timedelta(days=SESSION_TTL_DAYS),
        }
    )
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_TTL_DAYS * 24 * 3600,
        path="/",
    )


async def require_studio(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Faça login para continuar")
    session = await db.sessions.find_one({"id": token})
    if not session:
        raise HTTPException(status_code=401, detail="Sessão inválida — faça login novamente")
    expires_at = session.get("expires_at")
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            await db.sessions.delete_one({"id": token})
            raise HTTPException(status_code=401, detail="Sessão expirada — faça login novamente")
    studio = await db.studios.find_one({"id": session["studio_id"]})
    if not studio:
        raise HTTPException(status_code=401, detail="Studio não encontrado")
    return studio
