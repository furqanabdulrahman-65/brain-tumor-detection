from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: str
    is_doctor: bool = False

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ReportBase(BaseModel):
    symptoms: str
    notes: Optional[str] = None
    patient_name: str
    age: int
    gender: str
    email: Optional[str] = None
    phone: Optional[str] = None

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    id: int
    patient_id: int
    created_at: datetime
    image_path: str
    prediction_label: str
    confidence_score: float
    bbox: Optional[str] = None
    patient_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    heatmap_image_path: Optional[str] = None
    
    tumor_size: Optional[float] = None
    urgency: Optional[str] = None
    key_findings: Optional[str] = None # JSON string, parsed by frontend
    tumor_analytics: Optional[str] = None # JSON string, parsed by frontend
    secondary_opinions: Optional[str] = None # JSON string, parsed by frontend
    
    # Enhanced Imagery
    annotated_image_path: Optional[str] = None
    cropped_image_path: Optional[str] = None

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    content: str
    is_bot: bool = False
    timestamp: Optional[datetime] = None
    report_id: Optional[int] = None

class BBox(BaseModel):
    x: float
    y: float
    w: float
    h: float
