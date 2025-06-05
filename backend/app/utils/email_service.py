import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app, url_for, render_template_string
from threading import Thread

def send_async_email(app, msg):
    with app.app_context():
        try:
            current_app.logger.info(f"Connecting to {current_app.config['MAIL_SERVER']}:{current_app.config['MAIL_PORT']}")
            with smtplib.SMTP_SSL(
                current_app.config['MAIL_SERVER'],
                current_app.config['MAIL_PORT']
            ) as server:
                if current_app.config['MAIL_USERNAME'] and current_app.config['MAIL_PASSWORD']:
                    server.login(
                        current_app.config['MAIL_USERNAME'],
                        current_app.config['MAIL_PASSWORD']
                    )
                server.send_message(msg)
                current_app.logger.info(f"Email successfully sent to {msg['To']}")
        except Exception as e:
            current_app.logger.error(f"Failed to send email to {msg['To']}: {e}")

def send_email(subject, recipients, text_body, html_body):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
    msg['To'] = ', '.join(recipients) if isinstance(recipients, list) else recipients

    msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    Thread(target=send_async_email, args=(current_app._get_current_object(), msg)).start()


def send_verification_email(user):
    token = user.generate_token('email_verification')
    # Point to the frontend verification page with the token
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3001')
    verify_url = f"{frontend_url}/verify-email?token={token}"

    subject = "Verify Your Email Address"

    text_body = f"""\
Welcome to CourseMate! Thanks for signing up.
Please verify your email address by clicking the link below:

{verify_url}

If you didn't create an account, please ignore this email.
"""

    html_body = f"""\
<h1>Welcome to CourseMate!</h1>
<p>Thanks for signing up. Please verify your email address by clicking the button below:</p>
<p><a href="{verify_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; 
   text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">
   Verify Email</a></p>
<p>Or copy and paste this link into your browser:</p>
<p><code>{verify_url}</code></p>
<p>If you didn't create an account, please ignore this email.</p>
"""

    send_email(subject, user.email, text_body, html_body)


def send_password_reset_email(user):
    token = user.generate_token('password_reset')
    reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
    
    subject = "Reset Your Password"
    
    text_body = f"""\
    You requested a password reset for your CourseMate account.
    Please click the link below to reset your password:
    
    {reset_url}
    
    If you didn't request this, please ignore this email and your password will remain unchanged.
    The link will expire in 1 hour.
    """
    
    html_body = f"""\
    <h1>Reset Your Password</h1>
    <p>You requested a password reset for your CourseMate account.</p>
    <p>Please click the button below to reset your password:</p>
    <p><a href="{url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Reset Password</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p><code>{url}</code></p>
    <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    <p><small>The link will expire in 1 hour.</small></p>
    """.format(url=reset_url)
    
    send_email(subject, user.email, text_body, html_body)
