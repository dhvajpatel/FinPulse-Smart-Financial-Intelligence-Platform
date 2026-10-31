"""
FinPulse DB Migration
======================
Ensures the database schema is up to date by recreating all tables
from the SQLAlchemy models. Safe to re-run — uses CREATE TABLE IF NOT EXISTS.

Run:
    cd backend
    python migrate_db.py
"""
from database.connection import engine, Base
import database.models  # noqa: F401

Base.metadata.create_all(bind=engine)
print("[migrate] Schema is up to date.")
