# backend/app.py

import os

from flask import Flask
from dotenv import load_dotenv

from admin.routes import admin_bp
from owner.routes import owner_bp
from customer.routes import customer_bp
from flask import render_template


# Load environment variables
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(BASE_DIR, "../frontend/templates"),
        static_folder=os.path.join(BASE_DIR, "../frontend/static"),
    )

    secret = os.getenv("SECRET_KEY")
    if not secret:
        raise RuntimeError("SECRET_KEY is not set")

    app.secret_key = secret

    # Register blueprints
    app.register_blueprint(admin_bp)
    app.register_blueprint(owner_bp)
    app.register_blueprint(customer_bp)

    # Health check
    @app.route("/health")
    def health():
        return "OK", 200
    
    @app.route("/")
    def index():
        return render_template("index.html")


    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
