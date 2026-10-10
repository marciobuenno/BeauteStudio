"""Server-side date helpers. The pod clock is UTC — anchor "today" here, never in the browser."""

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def today_iso(tz: str | None = None) -> str:
    """Today's date as YYYY-MM-DD in `tz` (default: APP_TZ env, else UTC)."""
    zone = tz or os.environ.get("APP_TZ", "UTC")
    return datetime.now(ZoneInfo(zone)).strftime("%Y-%m-%d")


def aware(dt: datetime | None) -> datetime | None:
    """Normalise a naive BSON datetime to aware UTC so it compares and serialises safely."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def aware_doc(doc: dict) -> dict:
    """Shallow copy of a Mongo doc with every datetime normalised to aware UTC."""
    return {k: aware(v) if isinstance(v, datetime) else v for k, v in doc.items()}
