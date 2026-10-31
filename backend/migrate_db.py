"""
FinPulse DB Migration
======================
Adds new columns to the 'customers' table and creates the
'daily_entries' table if they don't already exist.

Run once after pulling this update:
    cd backend
    python migrate_db.py

Safe to re-run — uses IF NOT EXISTS / ignores duplicate-column errors.
"""
import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "smartbank.db"

if not DB_PATH.exists():
    print(f"[migrate] DB not found at {DB_PATH}. Run load_data.py first.")
    raise SystemExit(1)

conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()

# ── 1. Add new columns to customers ──────────────────────────────────────────
NEW_CUSTOMER_COLS = [
    ("dob",           "TEXT"),
    ("gender",        "TEXT"),
    ("phone",         "TEXT"),
    ("email",         "TEXT"),
    ("state",         "TEXT"),
    ("district",      "TEXT"),
    ("village",       "TEXT"),
    ("pan_number",    "TEXT"),
    ("aadhaar_last4", "TEXT"),
]

# Get existing columns
cur.execute("PRAGMA table_info(customers)")
existing_cols = {row[1] for row in cur.fetchall()}

added = []
for col_name, col_type in NEW_CUSTOMER_COLS:
    if col_name not in existing_cols:
        cur.execute(f"ALTER TABLE customers ADD COLUMN {col_name} {col_type}")
        added.append(col_name)
        print(f"[migrate] Added column: customers.{col_name}")

if not added:
    print("[migrate] customers table — no new columns needed.")

# ── 2. Create daily_entries table ─────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS daily_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT    NOT NULL REFERENCES customers(customer_id),
    entry_date  TEXT    NOT NULL,
    entry_type  TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    amount      REAL    NOT NULL,
    note        TEXT,
    created_at  TEXT    NOT NULL
)
""")

# Index for fast per-customer queries
cur.execute("""
CREATE INDEX IF NOT EXISTS ix_daily_entries_customer_id
ON daily_entries (customer_id)
""")
cur.execute("""
CREATE INDEX IF NOT EXISTS ix_daily_entries_date
ON daily_entries (entry_date)
""")

conn.commit()
conn.close()
print("[migrate] daily_entries table ready.")
print("[migrate] Migration complete.")
