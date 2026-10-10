"""Criterion: registering a new studio creates studio+session and a working public page."""

import uuid


def test_register_creates_studio_session_and_public_page(client):
    unique = uuid.uuid4().hex[:8]
    studio_name = f"tscheck Studio {unique}"
    email = f"tscheck-register-{unique}@example.com"

    resp = client.post(
        "/auth/register",
        json={
            "studio_name": studio_name,
            "owner_name": "Dona Teste",
            "email": email,
            "phone": "11977776666",
            "password": "senhaSegura123",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == email
    assert body["plan"] == "trial"
    assert "beaute_session" in resp.cookies

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["slug"] == body["slug"]

    public = client.get(f"/public/studios/{body['slug']}")
    assert public.status_code == 200, public.text
    pub = public.json()
    assert pub["services"] == []
    assert pub["professionals"] == []


def test_register_duplicate_email_rejected(client):
    unique = uuid.uuid4().hex[:8]
    email = f"tscheck-register-dup-{unique}@example.com"
    payload = {
        "studio_name": f"tscheck Dup Studio {unique}",
        "owner_name": "Dona",
        "email": email,
        "phone": "11977776666",
        "password": "senhaSegura123",
    }
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/auth/register", json=payload)
    assert second.status_code == 409
