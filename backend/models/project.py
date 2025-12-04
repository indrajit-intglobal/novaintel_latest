from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from db.database import Base
from utils.timezone import now_utc_from_ist

class ProjectStatus(str, enum.Enum):
    DRAFT = "Draft"
    ACTIVE = "Active"
    SUBMITTED = "Submitted"
    WON = "Won"
    LOST = "Lost"
    ARCHIVED = "Archived"

class ProjectType(str, enum.Enum):
    NEW = "new"
    EXPANSION = "expansion"
    RENEWAL = "renewal"

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    region = Column(String, nullable=False)
    project_type = Column(SQLEnum(ProjectType), default=ProjectType.NEW)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.DRAFT)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=now_utc_from_ist)
    updated_at = Column(DateTime, default=now_utc_from_ist, onupdate=now_utc_from_ist)
    
    # Go/No-Go Analysis
    go_no_go_score = Column(Float, nullable=True)  # 0-100 score
    go_no_go_report = Column(JSON, nullable=True)  # Detailed risk report
    
    # Battle Cards (Competitor Intelligence)
    battle_cards = Column(JSON, nullable=True)  # Competitor analysis
    
    # Audio Briefing
    audio_briefing_url = Column(String, nullable=True)  # URL to audio file
    audio_briefing_script = Column(Text, nullable=True)  # Generated script
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    rfp_documents = relationship("RFPDocument", back_populates="project", cascade="all, delete-orphan")
    insights = relationship("Insights", back_populates="project", uselist=False, cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="project", cascade="all, delete-orphan")
    # Case studies created from this project
    case_studies = relationship("CaseStudy", back_populates="project", cascade="all, delete-orphan")

