import os
import smtplib
from email.message import EmailMessage
from datetime import datetime

# Setup Dummy Configuration
# In a real app, these would come from environment variables
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "doctor@neuroscan.ai")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "dummy_password")
SMS_API_KEY = os.environ.get("SMS_API_KEY", "dummy_sms_key")

def send_email_report(to_email: str, patient_name: str, report_id: int, pdf_path: str = None):
    """
    Simulates sending an email with the report attached.
    """
    if not to_email:
        print(f"[Notification] No email provided for Report #{report_id}. Skipping.")
        return

    subject = f"NeuroScan AI Report: {patient_name} (ID: {report_id})"
    body = f"""
    Dear Patient/Target,

    Your brain tumor analysis report is ready.
    
    Patient: {patient_name}
    Report ID: {report_id}
    Date: {datetime.now().strftime('%Y-%m-%d')}
    
    Please find the report attached (Mock).
    
    Best regards,
    NeuroScan AI Team
    """

    print("-" * 50)
    print(f"[EMAIL SIMULATION] Sending Email to: {to_email}")
    print(f"Subject: {subject}")
    print(f"Attachment: {pdf_path if pdf_path else 'None'}")
    print("-" * 50)
    
    # Real implementation placeholder
    # try:
    #     msg = EmailMessage()
    #     msg.set_content(body)
    #     msg['Subject'] = subject
    #     msg['From'] = SMTP_USER
    #     msg['To'] = to_email
    #     
    #     if pdf_path and os.path.exists(pdf_path):
    #         with open(pdf_path, 'rb') as f:
    #             file_data = f.read()
    #             file_name = os.path.basename(pdf_path)
    #         msg.add_attachment(file_data, maintype='application', subtype='pdf', filename=file_name)
    #     
    #     with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
    #         server.starttls()
    #         server.login(SMTP_USER, SMTP_PASSWORD)
    #         server.send_message(msg)
    # except Exception as e:
    #     print(f"Failed to send email: {e}")

def send_sms_alert(phone_number: str, patient_name: str, diagnosis: str, confidence: float):
    """
    Simulates sending an SMS alert for high-confidence detections.
    """
    if not phone_number:
        return

    # Only send alert for Tumor Detected with high confidence
    if diagnosis == "Tumor Detected" and confidence > 0.40:
        message = f"URGENT: NeuroScan Alert for {patient_name}. Tumor Detected with {(confidence*100):.1f}% confidence. Please review immediately."
        
        print("-" * 50)
        print(f"[SMS SIMULATION] Sending SMS to: {phone_number}")
        print(f"Message: {message}")
        print("-" * 50)
    else:
        print(f"[Notification] SMS not sent. Low urgency for {patient_name}.")
