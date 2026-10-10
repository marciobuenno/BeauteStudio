"""Password hashing, tokens and ids — shared by auth routes and seed.py."""

import secrets
import uuid

from passlib.context import CryptContext

_pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd.verify(password, password_hash)


def new_token() -> str:
    return secrets.token_urlsafe(32)


def new_id() -> str:
    """String uuid4 — never Mongo ObjectId (not JSON-serializable)."""
    return str(uuid.uuid4())
