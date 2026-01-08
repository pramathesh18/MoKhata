# backend/utils/email.py

import os
import smtplib
import ssl
from email.mime.text import MIMEText

from dotenv import load_dotenv


# Load environment variables once
load_dotenv()

EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "0"))
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM")

if not all([EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_FROM]):
    raise RuntimeError("Email environment variables not fully set")


def send_otp_email(to_email: str, otp: int) -> bool:
    """
    Send OTP email for owner login.
    Returns True on success, False on failure.
    """

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

        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10)
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()

        server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
        server.sendmail(EMAIL_FROM, to_email, msg.as_string())
        server.quit()

        return True

    except Exception as e:
        print("OTP email error:", e)
        return False
