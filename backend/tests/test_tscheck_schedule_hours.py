"""Criterion: schedule editor changes a day's hours, persists, and public slots reflect it."""

from datetime import datetime, timedelta

EMAIL = "contato@beauteclinic.com.br"
PASSWORD = "beaute123"
SLUG = "beaute-studio-1"


def _login(client):
    resp = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert resp.status_code == 200, resp.text


def _future_weekday_date(today_iso: str, weekday: int, min_days_ahead: int = 10) -> str:
    d = datetime.strptime(today_iso, "%Y-%m-%d") + timedelta(days=min_days_ahead)
    while d.weekday() != weekday:
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def test_schedule_update_persists_and_reflects_in_public_slots(client):
    _login(client)

    hours = client.get("/studio/hours")
    assert hours.status_code == 200, hours.text
    days = hours.json()

    # pick a weekday (not sunday=6) to tweak, open later at 11:00 instead of 09:00
    target = next(d for d in days if d["weekday"] == 3)  # Thursday
    original_open = target["open_time"]

    updated_days = [dict(d) for d in days]
    for d in updated_days:
        if d["weekday"] == 3:
            d["open_time"] = "11:00"

    put_payload = [
        {
            "weekday": d["weekday"],
            "open_time": d["open_time"],
            "close_time": d["close_time"],
            "closed": d["closed"],
        }
        for d in updated_days
    ]
    put_resp = client.put("/studio/hours", json={"entries": put_payload})
    assert put_resp.status_code == 200, put_resp.text

    # persists across a fresh GET
    refetch = client.get("/studio/hours").json()
    thursday = next(d for d in refetch if d["weekday"] == 3)
    assert thursday["open_time"] == "11:00"

    # public slots for a future thursday no longer include 09:00/09:30/10:00
    studio = client.get(f"/public/studios/{SLUG}").json()
    service_id = studio["services"][1]["id"]
    date = _future_weekday_date(studio["today"], weekday=3, min_days_ahead=10)
    slots = client.get(
        f"/public/studios/{SLUG}/slots", params={"date": date, "service_id": service_id}
    ).json()
    assert "09:00" not in slots
    assert "11:00" in slots

    # restore original hours so other tests/seeded state aren't permanently altered
    restore_payload = [
        {
            "weekday": d["weekday"],
            "open_time": original_open if d["weekday"] == 3 else d["open_time"],
            "close_time": d["close_time"],
            "closed": d["closed"],
        }
        for d in days
    ]
    restore = client.put("/studio/hours", json={"entries": restore_payload})
    assert restore.status_code == 200
