"""
Go/No-Go Strategic Oracle API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from db.database import get_db
from models.user import User
from models.project import Project
from models.rfp_document import RFPDocument
from models.icp_profile import ICPProfile
from models.win_loss_data import WinLossData
from utils.dependencies import get_current_user
from workflows.agents.go_no_go_analyzer import go_no_go_analyzer_agent
from utils.config import settings

router = APIRouter()

class GoNoGoAnalysisRequest(BaseModel):
    """Request for Go/No-Go analysis."""
    project_id: int
    rfp_document_id: int
    icp_profile_id: Optional[int] = None  # Optional: use specific ICP profile

class GoNoGoAnalysisResponse(BaseModel):
    """Response from Go/No-Go analysis."""
    success: bool
    score: float  # 0-100
    recommendation: str  # "go", "no-go", "conditional"
    alignment_score: float
    win_probability: float
    competitive_risk: float
    timeline_scope_risk: float
    hidden_signals: List[str]
    risk_factors: List[str]
    opportunities: List[str]
    detailed_analysis: str
    error: Optional[str] = None

@router.post("/analyze", response_model=GoNoGoAnalysisResponse)
async def analyze_go_no_go(
    request: GoNoGoAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Perform Go/No-Go analysis for an RFP opportunity.
    Analyzes RFP against ICP profile and historical win/loss data.
    """
    if not settings.ENABLE_GO_NO_GO_ANALYSIS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Go/No-Go analysis is disabled"
        )
    
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get RFP document
    rfp_doc = db.query(RFPDocument).filter(
        RFPDocument.id == request.rfp_document_id,
        RFPDocument.project_id == request.project_id
    ).first()
    
    if not rfp_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RFP document not found"
        )
    
    # Get ICP profile
    icp_profile = None
    if request.icp_profile_id:
        icp_profile = db.query(ICPProfile).filter(
            ICPProfile.id == request.icp_profile_id,
            ICPProfile.company_id == current_user.id
        ).first()
    else:
        # Get default ICP profile for user
        icp_profile = db.query(ICPProfile).filter(
            ICPProfile.company_id == current_user.id
        ).first()
    
    # Get win/loss data
    win_loss_data = db.query(WinLossData).filter(
        WinLossData.company_id == current_user.id
    ).limit(50).all()  # Get last 50 deals
    
    # Convert to dict format
    icp_dict = None
    if icp_profile:
        icp_dict = {
            "name": icp_profile.name,
            "industry": icp_profile.industry,
            "company_size_min": icp_profile.company_size_min,
            "company_size_max": icp_profile.company_size_max,
            "tech_stack": icp_profile.tech_stack or [],
            "budget_range_min": icp_profile.budget_range_min,
            "budget_range_max": icp_profile.budget_range_max,
            "geographic_regions": icp_profile.geographic_regions or []
        }
    
    win_loss_list = []
    if win_loss_data:
        for deal in win_loss_data:
            win_loss_list.append({
                "client_name": deal.client_name,
                "industry": deal.industry,
                "outcome": deal.outcome.value if deal.outcome else "unknown",
                "competitor": deal.competitor,
                "deal_size": deal.deal_size,
                "win_reasons": deal.win_reasons,
                "loss_reasons": deal.loss_reasons,
                "rfp_characteristics": deal.rfp_characteristics or {}
            })
    
    # Get RFP text
    rfp_text = rfp_doc.extracted_text or ""
    rfp_summary = ""  # Could get from insights if available
    
    # Perform analysis
    result = go_no_go_analyzer_agent.analyze(
        rfp_text=rfp_text,
        rfp_summary=rfp_summary or rfp_text[:1000],  # Use first 1000 chars as summary if no summary
        icp_profile=icp_dict,
        win_loss_data=win_loss_list
    )
    
    # Save to project
    project.go_no_go_score = result.get("score")
    project.go_no_go_report = {
        "recommendation": result.get("recommendation"),
        "alignment_score": result.get("alignment_score"),
        "win_probability": result.get("win_probability"),
        "competitive_risk": result.get("competitive_risk"),
        "timeline_scope_risk": result.get("timeline_scope_risk"),
        "hidden_signals": result.get("hidden_signals", []),
        "risk_factors": result.get("risk_factors", []),
        "opportunities": result.get("opportunities", []),
        "detailed_analysis": result.get("detailed_analysis", "")
    }
    db.commit()
    
    return GoNoGoAnalysisResponse(
        success=True,
        score=result.get("score", 50.0),
        recommendation=result.get("recommendation", "conditional"),
        alignment_score=result.get("alignment_score", 50.0),
        win_probability=result.get("win_probability", 50.0),
        competitive_risk=result.get("competitive_risk", 50.0),
        timeline_scope_risk=result.get("timeline_scope_risk", 50.0),
        hidden_signals=result.get("hidden_signals", []),
        risk_factors=result.get("risk_factors", []),
        opportunities=result.get("opportunities", []),
        detailed_analysis=result.get("detailed_analysis", ""),
        error=result.get("error")
    )

@router.get("/{project_id}")
async def get_go_no_go_analysis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get existing Go/No-Go analysis for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    if not project.go_no_go_score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Go/No-Go analysis found for this project"
        )
    
    report = project.go_no_go_report or {}
    
    return {
        "success": True,
        "score": project.go_no_go_score,
        "recommendation": report.get("recommendation", "unknown"),
        "alignment_score": report.get("alignment_score", 0),
        "win_probability": report.get("win_probability", 0),
        "competitive_risk": report.get("competitive_risk", 0),
        "timeline_scope_risk": report.get("timeline_scope_risk", 0),
        "hidden_signals": report.get("hidden_signals", []),
        "risk_factors": report.get("risk_factors", []),
        "opportunities": report.get("opportunities", []),
        "detailed_analysis": report.get("detailed_analysis", "")
    }

