# backend/owner/routes.py

import random
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import (
    Blueprint,
    request,
    render_template,
    redirect,
    abort,
    session,
)
from sqlalchemy import select, insert, delete, func
from werkzeug.security import generate_password_hash, check_password_hash

from db import engine
from schema import owners, customers, transactions, login_otps
from utils.email import send_otp_email


# =========================
# Auth Decorator
# =========================
def owner_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "owner_id" not in session:
            return redirect("/owner/login")
        return fn(*args, **kwargs)
    return wrapper


owner_bp = Blueprint("owner", __name__)


# =========================
# Owner Login (OTP)
# =========================
@owner_bp.route("/owner/login", methods=["GET", "POST"])
def owner_login():
    if request.method == "GET":
        return render_template("owner_login.html")

    email = request.form.get("email", "").lower().strip()
    if not email:
        abort(400)

    with engine.begin() as conn:
        owner = conn.execute(
            select(owners.c.id).where(owners.c.email == email)
        ).fetchone()

        if owner is None:
            abort(404)

        otp = random.randint(100000, 999999)
        otp_hash = generate_password_hash(str(otp))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        # One OTP per email
        conn.execute(
            delete(login_otps).where(login_otps.c.email == email)
        )

        conn.execute(
            insert(login_otps).values(
                email=email,
                otp_hash=otp_hash,
                expires_at=expires_at,
            )
        )

    # TODO: remove console OTP printing in production
    sent = send_otp_email(email, otp)

    # Never block login due to email failure
    if not sent:
        print(f"[OTP-EMAIL-FAILED] {email}")

    print(f"\n\n===== OTP DEBUG =====\nEMAIL: {email}\nOTP: {otp}\n=====================\n")


    session.clear()
    session["pending_owner_email"] = email



    return redirect("/owner/verify")


# =========================
# OTP Verification
# =========================
@owner_bp.route("/owner/verify", methods=["GET", "POST"])
def owner_verify():
    if request.method == "GET":
        return render_template("owner_verify.html")

    otp = request.form.get("otp", "").strip()
    if not otp:
        abort(400)

    email = session.get("pending_owner_email")
    if not email:
        abort(401)

    now = datetime.now(timezone.utc)

    with engine.begin() as conn:
        row = conn.execute(
            select(
                login_otps.c.otp_hash,
                login_otps.c.expires_at,
            )
            .where(
                login_otps.c.email == email,
                login_otps.c.expires_at > now,
            )
        ).fetchone()

        if row is None or not check_password_hash(row.otp_hash, otp):
            abort(401)

        owner = conn.execute(
            select(owners.c.id).where(owners.c.email == email)
        ).fetchone()

        if owner is None:
            abort(401)

        conn.execute(
            delete(login_otps).where(login_otps.c.email == email)
        )

    session.clear()
    session["owner_id"] = owner.id

    return redirect("/owner/dashboard")


# =========================
# Dashboard & Info
# =========================
@owner_bp.route("/owner/dashboard")
@owner_required
def owner_dashboard():
    return render_template("owner_dashboard.html")


@owner_bp.route("/owner/info")
@owner_required
def owner_info():
    owner_id = session["owner_id"]

    with engine.connect() as conn:
        row = conn.execute(
            select(owners.c.email, owners.c.shop_code)
            .where(owners.c.id == owner_id)
        ).fetchone()

    if row is None:
        abort(404)

    return {
        "email": row.email,
        "shop_code": row.shop_code,
    }


# =========================
# Customers
# =========================
@owner_bp.route("/owner/customers")
@owner_required
def owner_customers():
    owner_id = session["owner_id"]

    with engine.connect() as conn:
        rows = conn.execute(
            select(
                customers.c.customer_code,
                customers.c.name,
                customers.c.balance,
            )
            .where(customers.c.owner_id == owner_id)
            .order_by(customers.c.id.desc())
        ).fetchall()

    return {
        "customers": [
            {
                "customer_code": r.customer_code,
                "name": r.name,
                "balance": r.balance,
            }
            for r in rows
        ]
    }


@owner_bp.route("/owner/customers", methods=["POST"])
@owner_required
def create_customer():
    owner_id = session["owner_id"]

    name = request.form.get("name", "").strip()
    password = request.form.get("password", "").strip()

    if not name or not password:
        abort(400)

    if len(password) < 4:
        abort(400)

    password_hash = generate_password_hash(password)

    with engine.begin() as conn:
        # TODO: count-based code generation is race-condition prone
        count = conn.execute(
            select(func.count())
            .select_from(customers)
            .where(customers.c.owner_id == owner_id)
        ).scalar()

        customer_code = f"C{count + 1:03d}"

        conn.execute(
            insert(customers).values(
                owner_id=owner_id,
                customer_code=customer_code,
                name=name,
                password_hash=password_hash,
                balance=0,
            )
        )

    return {
        "message": "customer created",
        "customer_code": customer_code,
    }, 201


# =========================
# Transactions
# =========================
@owner_bp.route("/owner/transactions", methods=["POST"])
@owner_required
def add_transaction():
    owner_id = session["owner_id"]

    customer_code = request.form.get("customer_code", "").strip()
    note = request.form.get("note", "").strip()
    amount = request.form.get("amount", "").strip()

    try:
        amount = int(amount)
    except ValueError:
        abort(400)

    if amount == 0:
        abort(400)

    with engine.begin() as conn:
        customer = conn.execute(
            select(customers.c.id, customers.c.balance)
            .where(
                customers.c.owner_id == owner_id,
                customers.c.customer_code == customer_code,
            )
        ).fetchone()

        if customer is None:
            abort(404)

        conn.execute(
            insert(transactions).values(
                owner_id=owner_id,
                customer_id=customer.id,
                amount=amount,
                note=note or None,
            )
        )

        new_balance = customer.balance + amount

        conn.execute(
            customers.update()
            .where(customers.c.id == customer.id)
            .values(balance=new_balance)
        )

    return {"message": "transaction added"}, 201


@owner_bp.route("/owner/customers/<customer_code>/transactions")
@owner_required
def customer_transactions(customer_code):
    owner_id = session["owner_id"]

    with engine.connect() as conn:
        customer = conn.execute(
            select(customers.c.id, customers.c.name)
            .where(
                customers.c.owner_id == owner_id,
                customers.c.customer_code == customer_code,
            )
        ).fetchone()

        if customer is None:
            abort(404)

        rows = conn.execute(
            select(
                transactions.c.amount,
                transactions.c.note,
            )
            .where(
                transactions.c.owner_id == owner_id,
                transactions.c.customer_id == customer.id,
            )
            .order_by(transactions.c.id.desc())
        ).fetchall()

    return {
        "customer": customer.name,
        "customer_code": customer_code,
        "transactions": [
            {
                "amount": r.amount,
                "note": r.note,
            }
            for r in rows
        ],
    }


# =========================
# Logout
# =========================
@owner_bp.route("/owner/logout")
def owner_logout():
    session.clear()
    return redirect("/owner/login")
