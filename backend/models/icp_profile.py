"""
Ideal Customer Profile (ICP) model.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from db.database import Base
from utils.timezone import now_utc_from_ist

class ICPProfile(Base):
    """Ideal Customer Profile for Go/No-Go analysis."""
    __tablename__ = "icp_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Company/user that owns this ICP
    name = Column(String, nullable=False)  # ICP profile name (e.g., "Enterprise Healthcare")
    
    # ICP Criteria
    industry = Column(String, nullable=True)  # Target industry
    company_size_min = Column(Integer, nullable=True)  # Min employees
    company_size_max = Column(Integer, nullable=True)  # Max employees
    tech_stack = Column(JSON, nullable=True)  # Preferred tech stack (list)
    budget_range_min = Column(Integer, nullable=True)  # Min budget
    budget_range_max = Column(Integer, nullable=True)  # Max budget
    geographic_regions = Column(JSON, nullable=True)  # Target regions (list)
    
    # Additional criteria
    additional_criteria = Column(JSON, nullable=True)  # Flexible criteria
    
    # Auto-analysis tracking
    last_analyzed_at = Column(DateTime, nullable=True)  # When ICP was last analyzed by AI
    
    created_at = Column(DateTime, default=now_utc_from_ist)
    updated_at = Column(DateTime, default=now_utc_from_ist, onupdate=now_utc_from_ist)
    
    # Relationships
    company = relationship("User", back_populates="icp_profiles")

