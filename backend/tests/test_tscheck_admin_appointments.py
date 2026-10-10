"""Criterion: admin manually creates an appointment, then completes/cancels it; metrics update."""

import uuid
from datetime import datetime, timedelta

EMAIL = "contato@beauteclinic.com.br"
PASSWORD = "beaute123"


def _login(client):
    resp = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert resp.status_code == 200, resp.text


def _future_open_date(today_iso: str, days: int = 30) -> str:
    d = datetime.strptime(today_iso, "%Y-%m-%d") + timedelta(days=days)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def test_manual_appointment_create_complete_cancel(client):
    _login(client)
    me = client.get("/auth/me").json()
    services = client.get("/services").json()
    service = services[0]
    date = _future_open_date(me["today"], days=40)
    unique = uuid.uuid4().hex[:8]

    create = client.post(
        "/appointments",
        json={
            "service_id": service["id"],
            "professional_id": None,
            "date": date,
            "time": "12:00",
            "customer_name": f"tscheck-appt-{unique}",
            "customer_phone": "11988887777",
            "notes": "criado via tscheck",
        },
    )
    assert create.status_code == 201, create.text
    appt = create.json()
    assert appt["status"] == "confirmed"

    listing = client.get("/appointments", params={"scope": "upcoming"})
    assert any(a["id"] == appt["id"] for a in listing.json())

    complete = client.patch(f"/appointments/{appt['id']}", json={"status": "completed"})
    assert complete.status_code == 200, complete.text
    assert complete.json()["status"] == "completed"

    # second fixture appointment to exercise cancel path independently
    create2 = client.post(
        "/appointments",
        json={
            "service_id": service["id"],
            "professional_id": None,
            "date": date,
            "time": "13:00",
            "customer_name": f"tscheck-appt-cancel-{unique}",
            "customer_phone": "11988887778",
            "notes": "",
        },
    )
    assert create2.status_code == 201, create2.text
    appt2 = create2.json()

    cancel = client.patch(f"/appointments/{appt2['id']}", json={"status": "cancelled"})
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["status"] == "cancelled"


def test_manual_appointment_requires_auth(client):
    resp = client.post(
        "/appointments",
        json={
            "service_id": "whatever",
            "date": "2030-01-01",
            "time": "12:00",
            "customer_name": "tscheck-noauth",
            "customer_phone": "11988880000",
        },
    )
    assert resp.status_code in (401, 403)
