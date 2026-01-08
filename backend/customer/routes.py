# backend/customer/routes.py

from functools import wraps

from flask import (
    Blueprint,
    request,
    render_template,
    redirect,
    session,
    abort,
)
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from db import engine
from schema import owners, customers, transactions


# =========================
# Auth Decorator
# =========================
def customer_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "customer_id" not in session:
            return redirect("/customer/login")
        return fn(*args, **kwargs)
    return wrapper


customer_bp = Blueprint("customer", __name__)


# =========================
# Login
# =========================
@customer_bp.route("/customer/login", methods=["GET", "POST"])
def customer_login():
    if request.method == "GET":
        return render_template("customer_login.html")

    shop_code = request.form.get("shop_code", "").strip().upper()
    customer_code = request.form.get("customer_code", "").strip().upper()
    password = request.form.get("password", "")

    if not shop_code or not customer_code or not password:
        abort(400)

    with engine.connect() as conn:
        row = conn.execute(
            select(
                customers.c.id,
                customers.c.password_hash,
                customers.c.owner_id,
            )
            .select_from(customers.join(owners))
            .where(
                owners.c.shop_code == shop_code,
                customers.c.customer_code == customer_code,
            )
        ).fetchone()

    if row is None:
        abort(401)

    if not check_password_hash(row.password_hash, password):
        abort(401)

    session.clear()
    session["customer_id"] = row.id
    session["owner_id"] = row.owner_id

    return redirect("/customer/dashboard")


# =========================
# Dashboard
# =========================
@customer_bp.route("/customer/dashboard")
@customer_required
def customer_dashboard():
    return render_template("customer_dashboard.html")


# =========================
# Customer Data API
# =========================
@customer_bp.route("/customer/data")
@customer_required
def customer_data():
    customer_id = session["customer_id"]
    owner_id = session["owner_id"]

    with engine.connect() as conn:
        customer = conn.execute(
            select(
                customers.c.name,
                customers.c.customer_code,
                owners.c.shop_code,
                customers.c.balance,
            )
            .select_from(customers.join(owners))
            .where(
                customers.c.id == customer_id,
                customers.c.owner_id == owner_id,
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
                transactions.c.customer_id == customer_id,
            )
            .order_by(transactions.c.id.desc())
        ).fetchall()

    return {
        "customer": customer.name,
        "customer_code": customer.customer_code,
        "shop_code": customer.shop_code,
        "balance": customer.balance,
        "transactions": [
            {
                "amount": r.amount,
                "note": r.note,
            }
            for r in rows
        ],
    }


# =========================
# Change Password
# =========================
@customer_bp.route("/customer/change-password", methods=["POST"])
@customer_required
def customer_change_password():
    customer_id = session["customer_id"]
    owner_id = session["owner_id"]

    current_password = request.form.get("current_password", "")
    new_password = request.form.get("new_password", "")

    if not new_password or len(new_password) < 4:
        return "Password too short", 400

    with engine.begin() as conn:
        row = conn.execute(
            select(customers.c.password_hash)
            .where(
                customers.c.id == customer_id,
                customers.c.owner_id == owner_id,
            )
        ).fetchone()

        if row is None:
            abort(404)

        if not check_password_hash(row.password_hash, current_password):
            return "Current password incorrect", 401

        conn.execute(
            customers.update()
            .where(
                customers.c.id == customer_id,
                customers.c.owner_id == owner_id,
            )
            .values(password_hash=generate_password_hash(new_password))
        )

    return "Password updated successfully"


# =========================
# Logout
# =========================
@customer_bp.route("/customer/logout")
def customer_logout():
    session.clear()
    return redirect("/customer/login")
