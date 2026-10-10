"""Criterion: customer books via public modal flow (service -> pro/any -> date -> slot -> confirm)."""

from datetime import datetime, timedelta

SLUG = "beaute-studio-1"


def _future_open_date(today_iso: str, days: int = 20) -> str:
    d = datetime.strptime(today_iso, "%Y-%m-%d") + timedelta(days=days)
    while d.weekday() == 6:
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def test_public_booking_creates_confirmed_appointment(client):
    studio = client.get(f"/public/studios/{SLUG}").json()
    service = next(s for s in studio["services"] if s["name"] == "Design com Henna")
    date = _future_open_date(studio["today"], days=21)

    slots = client.get(
        f"/public/studios/{SLUG}/slots",
        params={"date": date, "service_id": service["id"]},
    ).json()
    assert slots, "expected free slots on a chosen future open weekday"
    chosen_time = slots[0]

    payload = {
        "service_id": service["id"],
        "professional_id": None,
        "date": date,
        "time": chosen_time,
        "customer_name": "tscheck-public-booking Cliente",
        "customer_phone": "11999990000",
        "notes": "",
    }
    resp = client.post(f"/public/studios/{SLUG}/appointments", json=payload)
    assert resp.status_code == 201, resp.text
    appt = resp.json()
    assert appt["status"] == "confirmed"
    assert appt["service_name"] == "Design com Henna"
    assert appt["date"] == date
    assert appt["time"] == chosen_time
    assert appt["professional_name"] is not None


def test_public_booking_rejects_taken_slot_with_409(client):
    studio = client.get(f"/public/studios/{SLUG}").json()
    service = next(s for s in studio["services"] if s["name"] == "Lash Lifting")
    professional = next(p for p in studio["professionals"] if "Cílios" in p["specialty"] or True)
    date = _future_open_date(studio["today"], days=25)

    slots = client.get(
        f"/public/studios/{SLUG}/slots",
        params={"date": date, "service_id": service["id"], "professional_id": professional["id"]},
    ).json()
    assert slots
    chosen_time = slots[0]

    payload = {
        "service_id": service["id"],
        "professional_id": professional["id"],
        "date": date,
        "time": chosen_time,
        "customer_name": "tscheck-public-booking Conflito 1",
        "customer_phone": "11999990001",
        "notes": "",
    }
    first = client.post(f"/public/studios/{SLUG}/appointments", json=payload)
    assert first.status_code == 201, first.text

    payload2 = {**payload, "customer_name": "tscheck-public-booking Conflito 2"}
    second = client.post(f"/public/studios/{SLUG}/appointments", json=payload2)
    assert second.status_code == 409, second.text
