import sys
import os

# TRIGGER_RELOAD

# HACK: Fix for [Errno 22] Invalid argument on Windows console
# This MUST be before any other imports that might cache sys.stdout
if sys.platform == 'win32':
    class SafeStream:
        def __init__(self, original_stream):
            self.original_stream = original_stream
        
        def write(self, data):
            try:
                self.original_stream.write(data)
            except OSError:
                pass
                
        def flush(self):
            try:
                self.original_stream.flush()
            except OSError:
                pass
                
        def __getattr__(self, attr):
            return getattr(self.original_stream, attr)

    sys.stdout = SafeStream(sys.stdout)
    sys.stderr = SafeStream(sys.stderr)

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import List
import json

import models, schemas, database, auth, crud, ml_service, pdf_generator, chat_service, notification_service

# Create Tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()
print("!!! SERVER RESTARTING: ML LOGIC UPDATED TO SENSITIVITY MODE (0.30) - VERIFIED V2 !!!")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

from fastapi import Request
@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = f"ERROR: {exc}\n{traceback.format_exc()}\n"
    print(error_msg)
    try:
        with open("backend_errors.log", "a") as f:
            f.write(error_msg + "-"*20 + "\n")
    except Exception as log_error:
        print(f"Failed to write to log file: {log_error}")
        
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()},
    )

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

# Static Files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets") # Serve assets

@app.get("/manifest.json")
async def get_manifest():
    return FileResponse(os.path.join(FRONTEND_DIR, "manifest.json"))

@app.get("/sw.js")
async def get_sw():
    return FileResponse(os.path.join(FRONTEND_DIR, "sw.js"), media_type="application/javascript")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

# Removed /token and /api/register and /api/users/me endpoints as they are no longer needed

@app.post("/api/predict")
async def predict_tumor(
    file: UploadFile = File(...),
    symptoms: str = Form(""),
    notes: str = Form(""),
    patient_name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    email: str = Form(None), # Added email
    phone: str = Form(None), # Added phone
    db: Session = Depends(database.get_db)
):
    print(f"DEBUG: Received prediction request. Name={patient_name}, Email={email}, Phone={phone}") # DEBUG LOG
    
    # Define UPLOAD_DIR clearly at start
    UPLOAD_DIR = os.path.abspath(os.path.join(FRONTEND_DIR, "assets", "uploads"))
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # READ IMAGE
    contents = await file.read()
    
    # PREDICT
    prediction_result = ml_service.ml_service.predict(contents)
    
    # SAVE REPORT
    import uuid
    # Ensure standard separators and absolute paths
    # Define UPLOAD_DIR clearly
    UPLOAD_DIR = os.path.abspath(os.path.join(FRONTEND_DIR, "assets", "uploads"))
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Safe filename generation
    ext = os.path.splitext(file.filename)[1]
    if not ext: ext = ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    
    # Use relative web path
    image_path = f"/static/assets/uploads/{filename}"
    
    save_path = os.path.join(UPLOAD_DIR, filename)
    try:
        with open(save_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        print(f"ERROR: Failed to save original image to {save_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save image: {e}")
    
    # Generate Visualizations if Tumor Detected
    annotated_path = None
    cropped_path = None
    
    if prediction_result.get("bbox"):
        try:
            ann_bytes, crop_bytes = ml_service.ml_service.generate_visualizations(contents, prediction_result["bbox"])
            
            if ann_bytes:
                ann_filename = f"annotated_{filename}"
                ann_path_full = os.path.join(UPLOAD_DIR, ann_filename)
                with open(ann_path_full, "wb") as f:
                    f.write(ann_bytes)
                annotated_path = f"/static/assets/uploads/{ann_filename}"
                
            if crop_bytes:
                crop_filename = f"crop_{filename}"
                crop_path_full = os.path.join(UPLOAD_DIR, crop_filename)
                with open(crop_path_full, "wb") as f:
                    f.write(crop_bytes)
                cropped_path = f"/static/assets/uploads/{crop_filename}"
        except Exception as e:
            print(f"ERROR: Visualization failed: {e}")
            # Do not fail request if viz fails, just log it
            import traceback
            traceback.print_exc()

    # Heatmap
    heatmap_bytes = prediction_result.get("heatmap")
    heatmap_path = None
    if heatmap_bytes:
        heatmap_filename = f"heatmap_{filename}"
        heatmap_full_path = os.path.join(UPLOAD_DIR, heatmap_filename)
        with open(heatmap_full_path, "wb") as f:
            f.write(heatmap_bytes)
        heatmap_path = f"/static/assets/uploads/{heatmap_filename}"
    
    # CRITICAL FIX: Sanitize dictionary before returning JSON
    # FastAPI/Starlette will try to .decode() bytes to utf-8, which crashes with binary data
    # We also need to handle Numpy types
    def sanitize_for_json(obj):
        if isinstance(obj, bytes):
            return None # Or "<bytes_omitted>"
        if isinstance(obj, dict):
            return {k: sanitize_for_json(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [sanitize_for_json(v) for v in obj]
        if hasattr(obj, "item"): # Numpy scalar
            return obj.item()
        if hasattr(obj, "tolist"): # Numpy array
            return obj.tolist()
        return obj

    sanitized_prediction = sanitize_for_json(prediction_result)

    # Generate Clinical Findings (AI)
    try:
        # Prepare context for AI
        patient_info = {
            "name": patient_name,
            "age": age,
            "gender": gender,
            "symptoms": symptoms,
            "notes": notes
        }
        # Call Chat Service
        findings = chat_service.generate_key_findings(prediction_result, patient_info)
        prediction_result["key_findings"] = findings
        sanitized_prediction["key_findings"] = findings
    except Exception as e:
        print(f"Error generating findings: {e}")
        prediction_result["key_findings"] = []

    # CREATE DB REPORT
    report_data = schemas.ReportCreate(
        symptoms=symptoms,
        notes=notes,
        patient_name=patient_name,
        age=age,
        gender=gender,
        email=email,
        phone=phone
    )
    report = crud.create_report(
        db, 
        report_data, 
        1, 
        image_path, 
        prediction_result, # Pass original to CRUD (it handles extraction)
        annotated_path=annotated_path, 
        cropped_path=cropped_path,
        heatmap_path=heatmap_path
    )

    # Trigger Notifications (Async in a real app, typically)
    try:
        if email:
            notification_service.send_email_report(email, patient_name, report.id) # PDF path generation is complex here, skipping attachment for MVP simulation
        if phone:
            notification_service.send_sms_alert(phone, patient_name, prediction_result["label"], prediction_result["confidence"])
    except Exception as e:
        print(f"Notification Error: {e}")
    
    return {
        "report_id": report.id,
        "prediction": sanitized_prediction,
        "image_path": image_path,
        "heatmap_path": heatmap_path 
    }

@app.get("/api/reports", response_model=List[schemas.Report])
def get_my_reports(db: Session = Depends(database.get_db)):
    # Return all reports
    return crud.get_reports_all(db)

@app.delete("/api/reports/{report_id}")
def delete_report_endpoint(report_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_report(db, report_id)
    if not success:
         raise HTTPException(status_code=404, detail="Report not found")
    return {"detail": "Report deleted successfully"}

@app.post("/api/chat")
async def chat_bot(message: schemas.ChatMessage, db: Session = Depends(database.get_db)):
    return chat_service.get_chat_response(message.content, message.report_id, db)

@app.put("/api/reports/{report_id}/annotation")
async def update_annotation(
    report_id: int, 
    bbox: schemas.BBox, 
    db: Session = Depends(database.get_db)
):
    """
    Updates the tumor annotation manually. 
    Regenerates visualizations and analytics based on the new BBox.
    """
    report = crud.get_user_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    print(f"DEBUG: Manual Annotation Update for #{report_id}: {bbox}")
    
    # 1. Load Original Image
    # Path is stored as relative web path e.g. /static/...
    # Convert to absolute system path
    rel_path = report.image_path.lstrip('/')
    if rel_path.startswith('static/'):
        # Remove 'static/' prefix because FRONTEND_DIR points to frontend root
        # and app mounts /static to FRONTEND_DIR
        # wait, app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
        # So /static/assets/uploads/x.jpg -> FRONTEND_DIR/assets/uploads/x.jpg
        sys_path = os.path.join(FRONTEND_DIR, rel_path[7:]) # remove 'static/'
    else:
        sys_path = os.path.join(BASE_DIR, rel_path) # Fallback
        
    if not os.path.exists(sys_path):
        raise HTTPException(status_code=500, detail="Original image file missing on server")
        
    try:
        with open(sys_path, "rb") as f:
            image_bytes = f.read()
            
        # 2. Regenerate Visualizations
        box_dict = {"x": bbox.x, "y": bbox.y, "w": bbox.w, "h": bbox.h}
        ann_bytes, crop_bytes = ml_service.ml_service.generate_visualizations(image_bytes, [box_dict])
        
        # 3. Save New Images (Overwrite or Create New)
        # We prefer overwriting the annotated/cropped files to keep cleanup simple
        # annotated_{filename}
        # crop_{filename}
        
        filename = os.path.basename(sys_path)
        upload_dir = os.path.dirname(sys_path)
        
        ann_filename = f"annotated_{filename}"
        crop_filename = f"crop_{filename}"
        
        if ann_bytes:
            with open(os.path.join(upload_dir, ann_filename), "wb") as f:
                f.write(ann_bytes)
            report.annotated_image_path = f"/static/assets/uploads/{ann_filename}"
            
        if crop_bytes:
            with open(os.path.join(upload_dir, crop_filename), "wb") as f:
                f.write(crop_bytes)
            report.cropped_image_path = f"/static/assets/uploads/{crop_filename}"
            
        # 4. Update Analytics (Recalculate features based on new box)
        # Load PIL Image
        from PIL import Image
        import io
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        new_analytics = ml_service.ml_service.analyze_tumor_features(pil_img, box_dict)
        report.tumor_analytics = json.dumps(new_analytics)
        
        # 5. Update Report Record
        # We store list of bboxes in DB string, but here we just have one manual one
        report.bbox = json.dumps([box_dict]) 
        report.prediction_label = "Tumor Detected" # Forced if manual annotation exists
        if report.confidence_score < 0.9: report.confidence_score = 1.0 # Doctor override = 100% confidence
        
        db.commit()
        
        return {
            "detail": "Annotation updated successfully",
            "analytics": new_analytics,
            "annotated_path": report.annotated_image_path,
            "cropped_path": report.cropped_image_path
        }
        
    except Exception as e:
        print(f"Error updating annotation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process annotation: {e}")

@app.get("/api/reports/{report_id}/pdf")
def download_report_pdf(report_id: int, db: Session = Depends(database.get_db)):
    # Get report
    report = crud.get_user_report(db, report_id) # Need to implement get specific report
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Generate PDF
    try:
        pdf_buffer = pdf_generator.generate_pdf_report(report, FRONTEND_DIR)
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"attachment; filename=\"NeuroScan_Report_{report_id}.pdf\""}
        )
    except Exception as e:
        print(f"Error generating PDF for report {report_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8004, reload=True)
