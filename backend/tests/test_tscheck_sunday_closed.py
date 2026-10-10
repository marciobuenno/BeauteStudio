"""Criterion: closed weekdays (domingo) return no free slots; respects business_hours."""

from datetime import datetime, timedelta

SLUG = "beaute-studio-1"


def _next_sunday(today_iso: str) -> str:
    d = datetime.strptime(today_iso, "%Y-%m-%d")
    days_ahead = (6 - d.weekday()) % 7
    days_ahead = days_ahead or 7  # ensure a future sunday, not today
    return (d + timedelta(days=days_ahead)).strftime("%Y-%m-%d")


def test_sunday_has_no_free_slots(client):
    studio = client.get(f"/public/studios/{SLUG}").json()
    service_id = studio["services"][0]["id"]
    sunday = _next_sunday(studio["today"])

    resp = client.get(
        f"/public/studios/{SLUG}/slots",
        params={"date": sunday, "service_id": service_id},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


def test_open_weekday_has_free_slots(client):
    studio = client.get(f"/public/studios/{SLUG}").json()
    service_id = studio["services"][1]["id"]  # Manicure, 60min
    d = datetime.strptime(studio["today"], "%Y-%m-%d")
    # pick a future weekday that's open (not sunday)
    future = d + timedelta(days=14)
    while future.weekday() == 6:
        future += timedelta(days=1)

    resp = client.get(
        f"/public/studios/{SLUG}/slots",
        params={"date": future.strftime("%Y-%m-%d"), "service_id": service_id},
    )
    assert resp.status_code == 200, resp.text
    slots = resp.json()
    assert "09:00" in slots
