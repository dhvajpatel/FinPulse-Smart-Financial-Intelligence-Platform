"""
FinPulse — Database initialisation script.

This script only creates the database schema (tables + indexes).
No synthetic or CSV data is loaded — all users are created through
the app's registration flow.

Run:
    cd backend
    python load_data.py
"""
from database.connection import engine, Base
import database.models  # noqa: F401 — registers all models on Base


def main():
    Base.metadata.create_all(bind=engine)
    print("Database schema created (users, customers, daily_entries).")
    print("Ready. Users are created via the /auth/register endpoint.")


if __name__ == "__main__":
    main()
