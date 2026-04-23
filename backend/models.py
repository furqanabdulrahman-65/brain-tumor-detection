from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Text, LargeBinary
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_doctor = Column(Boolean, default=False)
    
    reports = relationship("Report", foreign_keys="[Report.patient_id]", back_populates="patient")
    chats = relationship("ChatMessage", back_populates="user")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Optional: if a doctor reviews it
    
    created_at = Column(DateTime, default=datetime.utcnow)
    image_path = Column(String) # Path to stored MRI image
    
    prediction_label = Column(String) # e.g. "Tumor Detected"
    confidence_score = Column(Float) # e.g. 0.98
    bbox = Column(String, nullable=True) # JSON string for bounding box {x,y,w,h}
    
    symptoms = Column(Text)
    notes = Column(Text) # Doctor's notes
    
    # Patient Details
    patient_name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # Enhanced Imagery
    annotated_image_path = Column(String, nullable=True)
    cropped_image_path = Column(String, nullable=True)
    heatmap_image_path = Column(String, nullable=True)
    
    # Clinical Metrics
    tumor_size = Column(Float, nullable=True) # % of brain area
    urgency = Column(String, nullable=True) # Low, Medium, High
    key_findings = Column(Text, nullable=True) # JSON String
    tumor_analytics = Column(Text, nullable=True) # JSON String for advanced metrics
    secondary_opinions = Column(Text, nullable=True) # JSON String for Swin/CoAtNet results

    patient = relationship("User", foreign_keys=[patient_id], back_populates="reports")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_bot = Column(Boolean, default=False)
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chats")
