from flask import Flask
from db import get_db, close_db

from flask import session
from flask import request

from flask import render_template
from flask import redirect, url_for

from werkzeug.security import generate_password_hash, check_password_hash

import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()



app = Flask(__name__)
app.secret_key = "dev-secret-change-later"
otp_store = {}


@app.teardown_appcontext
def teardown_db(exception):
    close_db(exception)



@app.route("/")
def index():
    if session.get("owner_id"):
        return redirect("/owner/dashboard")

    if session.get("customer_id"):
        return redirect("/customer/dashboard")

    return render_template("index.html")





@app.route("/owner/login", methods=["GET", "POST"])
def owner_login():
    # 1. SHOW LOGIN PAGE
    if request.method == "GET":
        return render_template("owner_login.html")

    # 2. HANDLE FORM SUBMISSION
    email = request.form["email"]

    db = get_db()
    owner = db.execute(
        "SELECT id FROM owners WHERE email = ?",
        (email,)
    ).fetchone()

    if owner is None:
        return "Owner not found", 404

    import random
    otp = random.randint(100000, 999999)
    otp_store[email] = otp

    sent = send_otp_email(email, otp)
    print("OTP for", email, "is", otp)

    if not sent:
        return "Failed to send OTP", 500

    return redirect("/owner/verify")






def send_otp_email(to_email, otp):
    HOST = os.getenv("EMAIL_HOST")
    PORT = int(os.getenv("EMAIL_PORT"))
    USERNAME = os.getenv("EMAIL_USERNAME")
    PASSWORD = os.getenv("EMAIL_PASSWORD")
    EMAIL_FROM = os.getenv("EMAIL_FROM")

    subject = "MoKhata Login OTP"
    body = f"""
Your OTP for MoKhata login is:

{otp}

This OTP is valid for one login only.
If you did not request this, please ignore this email.
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email

    try:
        server = smtplib.SMTP(HOST, PORT)
        server.starttls()
        server.login(USERNAME, PASSWORD)
        server.sendmail(EMAIL_FROM, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print("OTP email error:", e)
        return False


from flask import request, redirect, session, render_template

@app.route("/owner/verify", methods=["GET", "POST"])
def owner_verify():
    # SHOW VERIFY PAGE
    if request.method == "GET":
        return render_template("owner_verify.html")

    # VERIFY OTP
    otp = request.form["otp"]

    # Find matching email for OTP
    email = None
    for e, o in otp_store.items():
        if str(o) == otp:
            email = e
            break

    if email is None:
        return "Invalid OTP", 401

    db = get_db()
    owner = db.execute(
        "SELECT id FROM owners WHERE email = ?",
        (email,)
    ).fetchone()

    if owner is None:
        return "Owner not found", 404

    # LOGIN OWNER
    session.clear()
    session["owner_id"] = owner["id"]

    # OTP USED → DELETE
    otp_store.pop(email, None)

    return redirect("/owner/dashboard")







def owner_required():
    if "owner_id" not in session:
        return redirect("/owner/login")
    

def customer_required():
    if "customer_id" not in session:
        return redirect("/customer/login")






@app.route("/owner/info")
def owner_info():
    auth = owner_required()
    if auth:
        return auth

    owner_id = session["owner_id"]
    db = get_db()

    owner = db.execute(
        "SELECT email, shop_code FROM owners WHERE id = ?",
        (owner_id,)
    ).fetchone()

    return {
        "email": owner["email"],
        "shop_code": owner["shop_code"]
    }







@app.route("/owner/dashboard")
def owner_dashboard():
    auth = owner_required()
    if auth:
        return auth
    return render_template("owner_dashboard.html")





@app.route("/owner/customers")
def owner_customers():
    auth = owner_required()
    if auth:
        return auth

    owner_id = session["owner_id"]
    db = get_db()

    rows = db.execute("""
        SELECT
            c.customer_code,
            c.name,
            COALESCE(SUM(t.amount), 0) AS balance
        FROM customers c
        LEFT JOIN transactions t
          ON c.id = t.customer_id
         AND t.owner_id = ?
        WHERE c.owner_id = ?
        GROUP BY c.id
        ORDER BY c.created_at DESC
    """, (owner_id, owner_id)).fetchall()

    return {
        "customers": [dict(row) for row in rows]
    }

@app.route("/owner/customers", methods=["POST"])
def create_customer():
    auth = owner_required()
    if auth:
        return auth

    owner_id = session["owner_id"]
    name = request.form["name"]
    password = request.form["password"]

    # VERY TEMP password handling
    password_hash = generate_password_hash(password)

    db = get_db()

    # count existing customers
    row = db.execute(
        "SELECT COUNT(*) AS count FROM customers WHERE owner_id = ?",
        (owner_id,)
    ).fetchone()

    next_num = row["count"] + 1
    customer_code = f"C{next_num:03d}"

    db.execute("""
        INSERT INTO customers (owner_id, customer_code, name, password_hash)
        VALUES (?, ?, ?, ?)
    """, (owner_id, customer_code, name, password_hash))

    db.commit()

    return {
        "message": "customer created",
        "customer_code": customer_code
    }


@app.route("/owner/transactions", methods=["POST"])
def add_transaction():
    auth = owner_required()
    if auth:
        return auth

    owner_id = session["owner_id"]
    customer_code = request.form["customer_code"]
    amount = int(request.form["amount"])
    note = request.form.get("note", "")

    if amount == 0:
        return {"error": "amount cannot be zero"}, 400

    db = get_db()

    customer = db.execute("""
        SELECT id FROM customers
        WHERE owner_id = ? AND customer_code = ?
    """, (owner_id, customer_code)).fetchone()

    if customer is None:
        return {"error": "customer not found"}, 404

    db.execute("""
        INSERT INTO transactions (owner_id, customer_id, amount, note)
        VALUES (?, ?, ?, ?)
    """, (owner_id, customer["id"], amount, note))

    db.commit()

    return {"message": "transaction added"}




@app.route("/owner/customers/<customer_code>/transactions")
def customer_transactions(customer_code):
    auth = owner_required()
    if auth:
        return auth

    owner_id = session["owner_id"]
    db = get_db()

    customer = db.execute("""
        SELECT id, name FROM customers
        WHERE owner_id = ? AND customer_code = ?
    """, (owner_id, customer_code)).fetchone()

    if customer is None:
        return {"error": "customer not found"}, 404

    rows = db.execute("""
        SELECT amount, note, created_at
        FROM transactions
        WHERE owner_id = ? AND customer_id = ?
        ORDER BY created_at DESC
    """, (owner_id, customer["id"])).fetchall()

    return {
        "customer": customer["name"],
        "customer_code": customer_code,
        "transactions": [dict(row) for row in rows]
    }


@app.route("/owner/logout")
def owner_logout():
    session.clear()
    return redirect("/owner/login")





@app.route("/customer/login", methods=["GET", "POST"])
def customer_login():
    if request.method == "POST":
        shop_code = request.form["shop_code"].strip().upper()
        customer_code = request.form["customer_code"].strip().upper()
        password = request.form["password"]

        db = get_db()
        customer = db.execute("""
            SELECT c.id, c.owner_id, c.password_hash
            FROM customers c
            JOIN owners o ON c.owner_id = o.id
            WHERE o.shop_code = ?
              AND c.customer_code = ?
        """, (shop_code, customer_code)).fetchone()

        if customer is None:
            return "Invalid shop or customer", 401

        if not check_password_hash(customer["password_hash"], password):
            return "Invalid password", 401

        session.clear()
        session["customer_id"] = customer["id"]
        session["owner_id"] = customer["owner_id"]

        return redirect("/customer/dashboard")

    return render_template("customer_login.html")







@app.route("/customer/dashboard")
def customer_dashboard():
    auth = customer_required()
    if auth:
        return auth
    return render_template("customer_dashboard.html")






@app.route("/customer/data")
def customer_data():
    auth = customer_required()
    if auth:
        return auth

    customer_id = session["customer_id"]
    owner_id = session["owner_id"]
    db = get_db()

    customer = db.execute("""
    SELECT c.name, c.customer_code, o.shop_code
    FROM customers c
    JOIN owners o ON c.owner_id = o.id
    WHERE c.id = ? AND c.owner_id = ?
""", (customer_id, owner_id)).fetchone()


    rows = db.execute("""
        SELECT amount, note, created_at
        FROM transactions
        WHERE owner_id = ? AND customer_id = ?
        ORDER BY created_at DESC
    """, (owner_id, customer_id)).fetchall()

    return {
    "customer": customer["name"],
    "customer_code": customer["customer_code"],
    "shop_code": customer["shop_code"],
    "balance": sum(r["amount"] for r in rows),
    "transactions": [dict(r) for r in rows]
}





@app.route("/customer/change-password", methods=["POST"])
def customer_change_password():
    auth = customer_required()
    if auth:
        return auth

    customer_id = session["customer_id"]
    owner_id = session["owner_id"]

    current_password = request.form["current_password"]
    new_password = request.form["new_password"]

    if not new_password or len(new_password) < 4:
        return "Password too short", 400

    db = get_db()
    customer = db.execute("""
        SELECT password_hash
        FROM customers
        WHERE id = ? AND owner_id = ?
    """, (customer_id, owner_id)).fetchone()

    if not check_password_hash(customer["password_hash"], current_password):
        return "Current password incorrect", 401

    new_hash = generate_password_hash(new_password)

    db.execute("""
        UPDATE customers
        SET password_hash = ?
        WHERE id = ? AND owner_id = ?
    """, (new_hash, customer_id, owner_id))

    db.commit()

    return "Password updated successfully"



@app.route("/customer/logout")
def customer_logout():
    session.clear()
    return redirect("/customer/login")


















if __name__ == "__main__":
    app.run(debug=True)







