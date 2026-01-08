# backend/admin/routes.py

import os

from flask import (
    Blueprint,
    request,
    abort,
    render_template_string,
)
from sqlalchemy.exc import IntegrityError

from db import get_conn
from schema import owners


# =========================
# Config
# =========================
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD not set")


admin_bp = Blueprint("admin", __name__, url_prefix="/__admin__")


# =========================
# Helpers
# =========================
def require_admin_password():
    """
    Simple admin gate.
    Intentionally returns 404 on failure to avoid endpoint discovery.
    """
    pw = request.form.get("password") or request.args.get("password")
    if pw != ADMIN_PASSWORD:
        abort(404)


# =========================
# Inline HTML (intentional)
# Admin panel is intentionally minimal and template-less
# =========================
LOGIN_HTML = """
<h2>Admin Login</h2>
<form method="post">
  <input type="password" name="password" placeholder="Admin password" required>
  <button type="submit">Continue</button>
</form>
"""

CREATE_OWNER_HTML = """
<h2>Create Owner</h2>

<form method="post" action="/__admin__/owners">
  <input type="password" name="password" placeholder="Admin password" required>
  <br><br>

  <input name="email" placeholder="Owner email" required>
  <br><br>

  <input name="shop_code" placeholder="Shop code" required>
  <br><br>

  <button type="submit">Create Owner</button>
</form>

{% if msg %}
  <p><strong>{{ msg }}</strong></p>
{% endif %}
"""


# =========================
# Routes
# =========================
@admin_bp.route("/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        require_admin_password()
        return render_template_string(CREATE_OWNER_HTML, msg=None)

    return render_template_string(LOGIN_HTML)


@admin_bp.route("/owners", methods=["POST"])
def create_owner():
    require_admin_password()

    email = request.form["email"].strip().lower()
    shop_code = request.form["shop_code"].strip().upper()

    try:
        with get_conn() as conn:
            with conn.begin():
                conn.execute(
                    owners.insert().values(
                        email=email,
                        shop_code=shop_code,
                    )
                )
        msg = "Owner created successfully"

    except IntegrityError:
        msg = "Email or shop code already exists"

    except Exception:
        msg = "Database error"

    return render_template_string(CREATE_OWNER_HTML, msg=msg)
