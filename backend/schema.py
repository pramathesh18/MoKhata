# backend/schema.py

from sqlalchemy import (
    MetaData,
    Table,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    func,
)

metadata = MetaData()

owners = Table(
    "owners",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("email", String(255), nullable=False, unique=True),
    Column("shop_code", String(32), nullable=False, unique=True),
)

customers = Table(
    "customers",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("owner_id", Integer, ForeignKey("owners.id", ondelete="CASCADE"), nullable=False),
    Column("customer_code", String(32), nullable=False),
    Column("name", String(255), nullable=False),
    Column("password_hash", Text, nullable=False),
    Column("balance", Integer, nullable=False, server_default="0"),
    UniqueConstraint("owner_id", "customer_code", name="uq_owner_customer"),
)

transactions = Table(
    "transactions",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("owner_id", Integer, ForeignKey("owners.id", ondelete="CASCADE"), nullable=False),
    Column("customer_id", Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
    Column("amount", Integer, nullable=False),
    Column("note", Text),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    CheckConstraint("amount != 0", name="chk_amount_nonzero"),
)

login_otps = Table(
    "login_otps",
    metadata,
    Column("email", String(255), primary_key=True),
    Column("otp_hash", String(255), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
)
