"""Criterion: services CRUD in admin — create, edit, delete (owner-authenticated)."""

import uuid

EMAIL = "contato@beauteclinic.com.br"
PASSWORD = "beaute123"


def _login(client):
    resp = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert resp.status_code == 200, resp.text


def test_service_create_edit_delete_roundtrip(client):
    _login(client)
    unique = uuid.uuid4().hex[:8]
    name = f"tscheck-service-{unique}"

    create = client.post(
        "/services",
        json={
            "name": name,
            "category": "Unhas",
            "description": "criado via tscheck",
            "price_cents": 12345,
            "duration_min": 45,
            "image_url": "",
        },
    )
    assert create.status_code == 201, create.text
    service = create.json()
    assert service["name"] == name
    assert service["active"] is True

    listing = client.get("/services")
    assert any(s["id"] == service["id"] for s in listing.json())

    public = client.get("/public/studios/beaute-studio-1")
    assert any(s["id"] == service["id"] for s in public.json()["services"])

    edit = client.patch(f"/services/{service['id']}", json={"price_cents": 54321})
    assert edit.status_code == 200, edit.text
    assert edit.json()["price_cents"] == 54321

    delete = client.delete(f"/services/{service['id']}")
    assert delete.status_code == 204

    listing2 = client.get("/services")
    assert not any(s["id"] == service["id"] for s in listing2.json())


def test_service_create_requires_auth(client):
    resp = client.post(
        "/services",
        json={
            "name": "tscheck-unauthorized",
            "category": "Unhas",
            "description": "",
            "price_cents": 1000,
            "duration_min": 30,
            "image_url": "",
        },
    )
    assert resp.status_code in (401, 403)
