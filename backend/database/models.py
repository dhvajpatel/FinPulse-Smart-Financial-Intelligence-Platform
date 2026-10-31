from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text, Boolean
from .connection import Base


class User(Base):
    """Registered user accounts — email + hashed password."""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(String, nullable=False)


class Customer(Base):
    """Extended profile for a registered user (1:1 with User via customer_id)."""
    __tablename__ = "customers"
    customer_id = Column(String, primary_key=True)  # same as str(User.id), e.g. "U1"
    name = Column(String)
    age = Column(Integer, nullable=True)
    occupation = Column(String, nullable=True)
    monthly_income = Column(Float, nullable=True)
    credit_score = Column(Integer, nullable=True)
    employment_years = Column(Float, nullable=True)
    city = Column(String, nullable=True)
    created_at = Column(String)
    # Extended profile fields
    dob = Column(String, nullable=True)          # YYYY-MM-DD
    gender = Column(String, nullable=True)       # Male / Female / Other
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    village = Column(String, nullable=True)
    pan_number = Column(String, nullable=True)
    aadhaar_last4 = Column(String, nullable=True)


class DailyEntry(Base):
    """User-submitted daily financial entries (income, expense, savings)."""
    __tablename__ = "daily_entries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), index=True)
    entry_date = Column(String)                  # YYYY-MM-DD
    entry_type = Column(String)                  # income / expense / savings
    category = Column(String)
    amount = Column(Float)
    payment_method = Column(String, nullable=True)  # Cash / UPI / Credit Card / Debit Card / Net Banking / Other
    note = Column(Text, nullable=True)
    created_at = Column(String)
