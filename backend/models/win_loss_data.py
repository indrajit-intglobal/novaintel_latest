"""
Win/Loss data model for historical deal analysis.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum as SQLEnum, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from db.database import Base
from utils.timezone import now_utc_from_ist

class DealOutcome(str, enum.Enum):
    """Deal outcome types."""
    WON = "won"
    LOST = "lost"
    NO_DECISION = "no_decision"
    CANCELLED = "cancelled"

class WinLossData(Base):
    """Historical win/loss data for Go/No-Go analysis."""
    __tablename__ = "win_loss_data"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Company/user that owns this data
    
    # Deal Information
    deal_id = Column(String, nullable=True)  # External deal ID
    client_name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    region = Column(String, nullable=True)
    
    # Competitive Information
    competitor = Column(String, nullable=True)  # Main competitor
    competitors = Column(JSON, nullable=True)  # All competitors (list)
    
    # Outcome
    outcome = Column(SQLEnum(DealOutcome), nullable=False)
    deal_size = Column(Float, nullable=True)  # Deal value
    deal_date = Column(DateTime, nullable=True)  # When deal closed/lost
    
    # Additional Context
    win_reasons = Column(Text, nullable=True)  # Why we won
    loss_reasons = Column(Text, nullable=True)  # Why we lost
    rfp_characteristics = Column(JSON, nullable=True)  # RFP characteristics (keywords, requirements, etc.)
    
    # Auto-generation tracking
    auto_generated = Column(Boolean, default=False)  # True if created automatically by AI agent
    
    created_at = Column(DateTime, default=now_utc_from_ist)
    updated_at = Column(DateTime, default=now_utc_from_ist, onupdate=now_utc_from_ist)
    
    # Relationships
    company = relationship("User", back_populates="win_loss_data")

