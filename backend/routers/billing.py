"""Mercado Pago Pix billing — Checkout Transparente (POST /v1/payments, payment_method_id=pix).

Security model straight from the playbook: the price is decided here (never trusted from the
client), activation happens only on a server-side `approved` confirmation, and every
activation is idempotent so a webhook retry cannot extend a plan twice.
"""

import hashlib
import hmac
import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from lib.auth import require_studio
from lib.dates import aware
from lib.db import db
from models.billing import BillingConfigOut, PixChargeIn, PixChargeOut, PixStatusOut

router = APIRouter(prefix="/billing", tags=["billing"])
logger = logging.getLogger(__name__)

MP_API = "https://api.mercadopago.com"

# Server-side price catalog — the client only sends a plan key.
PLANS: dict[str, dict] = {
    "monthly": {"amount_cents": 6900, "months": 1, "title": "Beauté — Plano Mensal"},
    "annual": {"amount_cents": 59000, "months": 12, "title": "Beauté — Plano Anual"},
}


def _token() -> str:
    token = os.environ.get("MP_ACCESS_TOKEN", "").strip()
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Pagamento via Pix ainda não configurado. Adicione o Access Token do Mercado Pago.",
        )
    return token


def _headers(idempotency_key: str | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {_token()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if idempotency_key:
        headers["X-Idempotency-Key"] = idempotency_key
    return headers


@router.get("/config", response_model=BillingConfigOut)
async def config():
    return BillingConfigOut(
        enabled=bool(os.environ.get("MP_ACCESS_TOKEN", "").strip()),
        monthly_cents=PLANS["monthly"]["amount_cents"],
        annual_cents=PLANS["annual"]["amount_cents"],
    )


@router.post("/pix", response_model=PixChargeOut, status_code=201)
async def create_pix(input: PixChargeIn, studio: dict = Depends(require_studio)):
    plan = PLANS[input.plan]
    cpf = "".join(ch for ch in input.cpf if ch.isdigit())
    if len(cpf) not in (11, 14):
        raise HTTPException(status_code=422, detail="Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido")

    idempotency_key = str(uuid.uuid4())
    external_reference = f"beaute:{studio['id']}:{input.plan}:{idempotency_key}"
    payload = {
        "transaction_amount": plan["amount_cents"] / 100,
        "description": plan["title"],
        "payment_method_id": "pix",
        "external_reference": external_reference,
        "payer": {
            "email": str(input.payer_email),
            "first_name": input.payer_first_name,
            "last_name": input.payer_last_name,
            "identification": {"type": "CPF" if len(cpf) == 11 else "CNPJ", "number": cpf},
        },
    }
    webhook_url = os.environ.get("MP_WEBHOOK_URL", "").strip()
    if webhook_url:
        payload["notification_url"] = webhook_url

    try:
        async with httpx.AsyncClient(timeout=25) as http:
            response = await http.post(
                f"{MP_API}/v1/payments", json=payload, headers=_headers(idempotency_key)
            )
    except httpx.HTTPError as exc:
        logger.error("mercadopago create_pix transport error: %s", exc)
        raise HTTPException(status_code=502, detail="Não foi possível falar com o Mercado Pago. Tente novamente.")

    if response.status_code >= 400:
        logger.error("mercadopago create_pix %s: %s", response.status_code, response.text[:500])
        raise HTTPException(
            status_code=502,
            detail="O Mercado Pago recusou a cobrança. Confira o Access Token e os dados do pagador.",
        )

    body = response.json()
    tx = (body.get("point_of_interaction") or {}).get("transaction_data") or {}
    if not body.get("id") or not tx.get("qr_code"):
        logger.error("mercadopago create_pix missing qr: %s", str(body)[:500])
        raise HTTPException(status_code=502, detail="O Mercado Pago não retornou o QR Code do Pix")

    now = datetime.now(timezone.utc)
    doc = {
        "id": str(body["id"]),
        "mp_payment_id": int(body["id"]),
        "studio_id": studio["id"],
        "idempotency_key": idempotency_key,
        "external_reference": external_reference,
        "plan": input.plan,
        "expected_amount_cents": plan["amount_cents"],
        "status": body.get("status", "pending"),
        "activated": False,
        "created_at": now,
    }
    await db.payments.insert_one(doc)

    return PixChargeOut(
        payment_id=doc["id"],
        status=doc["status"],
        plan=input.plan,
        amount_cents=plan["amount_cents"],
        qr_code=tx.get("qr_code"),
        qr_code_base64=tx.get("qr_code_base64"),
        ticket_url=tx.get("ticket_url"),
        created_at=now,
    )


async def _fetch_mp_payment(payment_id: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20) as http:
            response = await http.get(f"{MP_API}/v1/payments/{payment_id}", headers=_headers())
    except httpx.HTTPError as exc:
        logger.error("mercadopago get_payment transport error: %s", exc)
        raise HTTPException(status_code=502, detail="Não foi possível consultar o pagamento")
    if response.status_code != 200:
        logger.error("mercadopago get_payment %s: %s", response.status_code, response.text[:300])
        raise HTTPException(status_code=502, detail="Não foi possível consultar o pagamento")
    return response.json()


async def _activate_if_approved(local: dict, remote: dict) -> dict:
    """Idempotent: only an `approved` payment whose amount and reference match activates,
    and only once (guarded on activated=False)."""
    status = remote.get("status")
    updates: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}

    if status != "approved" or local.get("activated"):
        await db.payments.update_one({"id": local["id"]}, {"$set": updates})
        return {**local, **updates}

    paid_cents = round(float(remote.get("transaction_amount") or 0) * 100)
    if paid_cents != local["expected_amount_cents"] or remote.get("external_reference") != local["external_reference"]:
        logger.error("mercadopago mismatch on payment %s — refusing activation", local["id"])
        raise HTTPException(status_code=400, detail="O pagamento não corresponde à cobrança gerada")

    claimed = await db.payments.update_one(
        {"id": local["id"], "activated": False},
        {"$set": {**updates, "activated": True, "activated_at": datetime.now(timezone.utc)}},
    )
    if claimed.modified_count == 1:
        studio = await db.studios.find_one({"id": local["studio_id"]})
        months = PLANS[local["plan"]]["months"]
        now = datetime.now(timezone.utc)
        current = aware(studio.get("plan_expires_at")) if studio else None
        # Extend from the current expiry when the plan is still valid, else from today.
        base = current if current and current > now and studio.get("plan") == "active" else now
        await db.studios.update_one(
            {"id": local["studio_id"]},
            {"$set": {"plan": "active", "plan_expires_at": base + timedelta(days=30 * months)}},
        )
    return await db.payments.find_one({"id": local["id"]})


@router.get("/pix/{payment_id}", response_model=PixStatusOut)
async def pix_status(payment_id: str, studio: dict = Depends(require_studio)):
    local = await db.payments.find_one({"id": payment_id, "studio_id": studio["id"]})
    if not local:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")

    remote = await _fetch_mp_payment(payment_id)
    local = await _activate_if_approved(local, remote)
    fresh_studio = await db.studios.find_one({"id": studio["id"]})

    return PixStatusOut(
        payment_id=payment_id,
        status=local.get("status", "pending"),
        approved=bool(local.get("activated")),
        plan=local["plan"],
        amount_cents=local["expected_amount_cents"],
        plan_expires_at=aware(fresh_studio.get("plan_expires_at")) if fresh_studio else None,
    )


def valid_signature(x_signature: str | None, x_request_id: str | None, data_id: str | None) -> bool:
    """HMAC-SHA256 over `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` per MP docs."""
    secret = os.environ.get("MP_WEBHOOK_SECRET", "").strip()
    if not x_signature or not secret:
        return False
    parts = dict(
        item.strip().split("=", 1) for item in x_signature.split(",") if "=" in item
    )
    ts, received = parts.get("ts"), parts.get("v1")
    if not ts or not received:
        return False
    try:
        ts_num = int(ts)
    except ValueError:
        return False
    if ts_num > 10_000_000_000:  # tolerate millisecond timestamps
        ts_num //= 1000
    if abs(int(time.time()) - ts_num) > 300:  # reject replays
        return False

    manifest = ""
    if data_id:
        manifest += f"id:{data_id.lower()};"
    if x_request_id:
        manifest += f"request-id:{x_request_id};"
    manifest += f"ts:{ts};"
    expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)


@router.post("/webhook/mercadopago")
async def mercadopago_webhook(
    request: Request,
    data_id: str | None = Query(default=None, alias="data.id"),
    type: str | None = Query(default=None),
):
    """Public endpoint called by Mercado Pago. Never trusts the payload status — it
    re-fetches the payment server-side before activating anything."""
    try:
        body = await request.json()
    except Exception:
        body = {}

    event_type = type or body.get("type")
    if event_type != "payment":
        return {"ok": True}

    if os.environ.get("MP_WEBHOOK_SECRET", "").strip() and not valid_signature(
        request.headers.get("x-signature"), request.headers.get("x-request-id"), data_id
    ):
        raise HTTPException(status_code=401, detail="Assinatura inválida")

    payment_id = str((body.get("data") or {}).get("id") or data_id or "")
    if not payment_id.isdigit():
        return {"ok": True}

    local = await db.payments.find_one({"id": payment_id})
    if not local:  # never activate a payment we did not create
        return {"ok": True}

    remote = await _fetch_mp_payment(payment_id)
    await _activate_if_approved(local, remote)
    return {"ok": True}
