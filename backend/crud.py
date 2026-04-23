from sqlalchemy.orm import Session
import models, schemas, auth
import json

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, is_doctor=user.is_doctor)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_report(db: Session, report: schemas.ReportCreate, user_id: int, image_path: str, prediction: dict, annotated_path: str = None, cropped_path: str = None, heatmap_path: str = None):
    print(f"DEBUG: create_report keys: {prediction.keys()}")
    print(f"DEBUG: tumor_analytics value: {prediction.get('tumor_analytics')}")
    
    # Safe serialization
    try:
        ta_json = json.dumps(prediction.get("tumor_analytics")) if prediction.get("tumor_analytics") else None
        so_json = json.dumps(prediction.get("secondary_opinions")) if prediction.get("secondary_opinions") else None
    except Exception as e:
        print(f"DEBUG: JSON dump error: {e}")
        ta_json = None
        so_json = None
        
    db_report = models.Report(
        patient_id=user_id,
        image_path=image_path,
        prediction_label=prediction["label"],
        confidence_score=prediction["confidence"],
        bbox=json.dumps(prediction.get("bbox")) if prediction.get("bbox") else None,
        symptoms=report.symptoms,
        notes=report.notes,
        patient_name=report.patient_name,
        age=report.age,
        gender=report.gender,
        email=report.email,
        phone=report.phone,
        annotated_image_path=annotated_path,
        cropped_image_path=cropped_path,
        heatmap_image_path=heatmap_path,
        tumor_size=prediction.get("tumor_size"),
        urgency=prediction.get("urgency"),
        key_findings=json.dumps(prediction.get("key_findings")) if prediction.get("key_findings") else None,
        tumor_analytics=ta_json,
        secondary_opinions=so_json
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def get_reports(db: Session, user_id: int):
    return db.query(models.Report).filter(models.Report.patient_id == user_id).all()

def get_reports_all(db: Session):
    reports = db.query(models.Report).order_by(models.Report.created_at.desc()).all()
    if reports:
        print(f"DEBUG: First report tumor_analytics: {reports[0].tumor_analytics}")
    return reports

def get_user_report(db: Session, report_id: int):
    return db.query(models.Report).filter(models.Report.id == report_id).first()

def delete_report(db: Session, report_id: int):
    db_report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if db_report:
        db.delete(db_report)
        db.commit()
        return True
    return False
