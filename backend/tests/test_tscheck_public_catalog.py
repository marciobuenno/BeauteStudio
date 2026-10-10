"""Criterion: public page /b/beaute-studio-1 catalog (services, categories, professionals)."""

SLUG = "beaute-studio-1"


def test_public_catalog_has_seeded_services_categories_professionals(client):
    resp = client.get(f"/public/studios/{SLUG}")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["slug"] == SLUG
    # Use >= / issubset rather than exact counts: earlier test runs may have left
    # extra tscheck- fixture rows behind (acceptable residue in this namespace,
    # but it must not make this assertion flaky).
    assert len(data["services"]) >= 6
    assert {"Unhas", "Estética Facial", "Cílios & Sobrancelhas"}.issubset(set(data["categories"]))
    assert len(data["professionals"]) >= 2

    nail_services = [s for s in data["services"] if s["category"] == "Unhas"]
    assert len(nail_services) >= 3

    names = {s["name"] for s in data["services"]}
    assert "Alongamento em Gel" in names
    assert "Manicure Tradicional" in names


def test_public_catalog_unknown_slug_404(client):
    resp = client.get("/public/studios/this-slug-does-not-exist-xyz")
    assert resp.status_code == 404
