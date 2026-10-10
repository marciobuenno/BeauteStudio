"""Idempotent demo seed for Beauté — run: cd /app/backend && python seed.py"""

import asyncio
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from lib.db import db, ensure_indexes
from lib.security import hash_password, new_id

SLUG = "beaute-studio-1"
EMAIL = "contato@beauteclinic.com.br"
PASSWORD = "beaute123"

IMG = {
    "nails": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?crop=entropy&cs=srgb&fm=jpg&q=85",
    "facial": "https://images.unsplash.com/photo-1690749138086-7422f71dc159?crop=entropy&cs=srgb&fm=jpg&q=85",
    "hands": "https://images.unsplash.com/photo-1610992015836-7c249d75782d?crop=entropy&cs=srgb&fm=jpg&q=85",
    "giovana": "https://images.unsplash.com/photo-1728488196797-3db262ae92ab?crop=entropy&cs=srgb&fm=jpg&q=85",
    "juliana": "https://images.unsplash.com/photo-1762341113869-0bfa616b4457?crop=entropy&cs=srgb&fm=jpg&q=85",
}

SERVICES = [
    ("Alongamento em Gel", "Unhas", "Alongamento com gel, leve, resistente e com acabamento impecável.", 18000, 120, IMG["nails"]),
    ("Manicure Tradicional", "Unhas", "Cutilagem, lixamento e esmaltação perfeita das suas unhas.", 5500, 60, IMG["hands"]),
    ("Spa dos Pés", "Unhas", "Hidratação completa, esfoliação e esmaltação para pés renovados.", 8000, 50, IMG["hands"]),
    ("Limpeza de Pele Profunda", "Estética Facial", "Limpeza profunda com extração, máscara calmante e hidratação final.", 16000, 75, IMG["facial"]),
    ("Lash Lifting", "Cílios & Sobrancelhas", "Curvatura permanente dos cílios para um olhar marcante e natural.", 14000, 60, ""),
    ("Design com Henna", "Cílios & Sobrancelhas", "Design de sobrancelhas com henna para um preenchimento natural.", 6500, 40, ""),
]

PROFESSIONALS = [
    ("Giovana Sá", "Nail Designer & Esteticista", "Especialista em alongamento de unhas e cuidados da pele, com 8 anos de experiência.", IMG["giovana"]),
    ("Juliana Carneiro", "Especialista em Cílios & Sobrancelhas", "Referência em lash lifting e design de sobrancelhas com henna.", IMG["juliana"]),
]


async def main() -> None:
    await ensure_indexes()
    if await db.studios.find_one({"slug": SLUG}):
        print("seed: studio já existe — nada a fazer")
        return

    now = datetime.now(timezone.utc)
    studio_id = new_id()
    studio = {
        "id": studio_id,
        "name": "Beauté Clinic Studio",
        "slug": SLUG,
        "owner_name": "Giovana Sá",
        "email": EMAIL,
        "phone": "(11) 98888-0000",
        "tagline": "Sua melhor versão, todos os dias.",
        "about": "Um sanctuary de beleza pensado nos mínimos detalhes: atendimento personalizado, produtos premium e ambientação acolhedora.",
        "address": "Rua das Flores, 123 — Jardins, São Paulo/SP",
        "plan": "trial",
        "plan_expires_at": now + timedelta(days=14),
        "password_hash": hash_password(PASSWORD),
        "created_at": now,
    }
    await db.studios.insert_one(studio)

    await db.business_hours.insert_many(
        [
            {"id": new_id(), "studio_id": studio_id, "weekday": wd, "open_time": "09:00", "close_time": "19:00", "closed": wd == 6}
            for wd in range(7)
        ]
    )

    service_docs = [
        {
            "id": new_id(),
            "studio_id": studio_id,
            "name": name,
            "category": category,
            "description": description,
            "price_cents": price_cents,
            "duration_min": duration_min,
            "image_url": image_url,
            "active": True,
            "sort_order": order,
            "created_at": now,
        }
        for order, (name, category, description, price_cents, duration_min, image_url) in enumerate(SERVICES)
    ]
    await db.services.insert_many(service_docs)

    professional_docs = [
        {
            "id": new_id(),
            "studio_id": studio_id,
            "name": name,
            "specialty": specialty,
            "bio": bio,
            "image_url": image_url,
            "active": True,
            "created_at": now,
        }
        for name, specialty, bio, image_url in PROFESSIONALS
    ]
    await db.professionals.insert_many(professional_docs)

    tz = ZoneInfo(os.environ.get("APP_TZ", "UTC"))
    sample_day = datetime.now(tz) + timedelta(days=1)
    while sample_day.weekday() == 6:  # studio is closed on Sundays
        sample_day += timedelta(days=1)
    tomorrow = sample_day.strftime("%Y-%m-%d")
    samples = [
        (service_docs[0], professional_docs[0], "10:00", "Marina Alves", "(11) 97777-1234", ""),
        (service_docs[1], professional_docs[1], "14:00", "Carla Menezes", "(11) 96666-4321", "Cliente prefere tons nude"),
        (service_docs[5], professional_docs[1], "16:00", "Renata Lima", "(11) 95555-9876", ""),
    ]
    await db.appointments.insert_many(
        [
            {
                "id": new_id(),
                "studio_id": studio_id,
                "service_id": service["id"],
                "service_name": service["name"],
                "professional_id": professional["id"],
                "professional_name": professional["name"],
                "date": tomorrow,
                "time": time,
                "duration_min": service["duration_min"],
                "price_cents": service["price_cents"],
                "customer_name": customer,
                "customer_phone": phone,
                "notes": notes,
                "status": "confirmed",
                "created_at": now,
            }
            for service, professional, time, customer, phone, notes in samples
        ]
    )

    print(f"seed ok: /b/{SLUG} | login: {EMAIL} | senha: {PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
