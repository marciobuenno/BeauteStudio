"""Criterion: owner login with seeded credentials opens session; wrong password rejected."""

EMAIL = "contato@beauteclinic.com.br"
PASSWORD = "beaute123"


def test_login_with_valid_credentials_returns_me(client):
    resp = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["email"] == EMAIL
    assert body["slug"] == "beaute-studio-1"
    assert "beaute_session" in resp.cookies

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == EMAIL


def test_login_with_invalid_password_rejected(client):
    resp = client.post("/auth/login", json={"email": EMAIL, "password": "senha-errada-123"})
    assert resp.status_code == 401
