# backend/utils/email.py

import os
import smtplib
import ssl
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()


def send_otp_email(to_email: str, otp: int) -> bool:
    HOST = os.getenv("EMAIL_HOST")
    PORT = int(os.getenv("EMAIL_PORT", "0"))
    USERNAME = os.getenv("EMAIL_USERNAME")
    PASSWORD = os.getenv("EMAIL_PASSWORD")
    EMAIL_FROM = os.getenv("EMAIL_FROM")

    if not all([HOST, PORT, USERNAME, PASSWORD, EMAIL_FROM]):
        raise RuntimeError("Email environment variables not fully set")

    subject = "MoKhata Login OTP"
    body = f"""Your OTP for MoKhata login is:

{otp}

This OTP is valid for 5 minutes.
If you did not request this, please ignore this email.
"""

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email

    try:
        context = ssl.create_default_context()

        server = smtplib.SMTP(HOST, PORT, timeout=10)
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()

        server.login(USERNAME, PASSWORD)
        server.sendmail(EMAIL_FROM, to_email, msg.as_string())
        server.quit()

        return True

    except Exception as e:
        print("OTP email error:", e)
        return False
