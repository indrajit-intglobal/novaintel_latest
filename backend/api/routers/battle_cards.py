"""
Battle Cards (Competitor Intelligence) API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from db.database import get_db
from models.user import User
from models.project import Project
from models.rfp_document import RFPDocument
from utils.dependencies import get_current_user
from workflows.agents.competitor_analyzer import competitor_analyzer_agent
from utils.config import settings
from utils.websocket_manager import global_ws_manager

router = APIRouter()

class BattleCardAnalysisRequest(BaseModel):
    """Request for battle card analysis."""
    project_id: int
    rfp_document_id: int

class BattleCardResponse(BaseModel):
    """Battle card response."""
    competitor: str
    weaknesses: List[str]
    feature_gaps: List[str]
    recommendations: List[str]
    detected_mentions: Optional[List[str]] = None

class BattleCardsAnalysisResponse(BaseModel):
    """Response from battle cards analysis."""
    success: bool
    competitors: List[str]
    battle_cards: List[BattleCardResponse]
    error: Optional[str] = None

@router.post("/analyze", response_model=BattleCardsAnalysisResponse)
async def analyze_battle_cards(
    request: BattleCardAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Analyze RFP for competitors and generate battle cards.
    """
    if not settings.ENABLE_BATTLE_CARDS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Battle Cards analysis is disabled"
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
    
    # Get RFP text
    rfp_text = rfp_doc.extracted_text or ""
    
    # Get RFP summary from insights if available
    rfp_summary = ""
    if project.insights:
        # rfp_summary is a JSON field, could be a dict or None
        if isinstance(project.insights.rfp_summary, dict):
            rfp_summary = project.insights.rfp_summary.get("summary", "") or ""
        elif isinstance(project.insights.rfp_summary, str):
            rfp_summary = project.insights.rfp_summary
        # Fallback to executive_summary if rfp_summary is None or empty
        if not rfp_summary:
            rfp_summary = project.insights.executive_summary or ""
    
    # Perform analysis
    result = competitor_analyzer_agent.analyze_rfp(
        rfp_text=rfp_text,
        rfp_summary=rfp_summary or rfp_text[:500],
        industry=project.industry
    )
    
    # Save to project
    project.battle_cards = {
        "competitors": result.get("competitors", []),
        "battle_cards": result.get("battle_cards", []),
        "analyzed_at": str(__import__("datetime").datetime.now())
    }
    db.commit()
    
    # Stream battle cards via WebSocket
    try:
        await global_ws_manager.send_to_user(
            current_user.id,
            {
                "type": "battle_cards",
                "project_id": request.project_id,
                "competitors": result.get("competitors", []),
                "battle_cards": result.get("battle_cards", []),
                "timestamp": str(__import__("datetime").datetime.now())
            }
        )
    except Exception as e:
        print(f"WebSocket error: {e}")
    
    # Format response
    battle_cards = []
    for card in result.get("battle_cards", []):
        battle_cards.append(BattleCardResponse(
            competitor=card.get("competitor", ""),
            weaknesses=card.get("weaknesses", []),
            feature_gaps=card.get("feature_gaps", []),
            recommendations=card.get("recommendations", []),
            detected_mentions=card.get("detected_mentions", [])
        ))
    
    return BattleCardsAnalysisResponse(
        success=True,
        competitors=result.get("competitors", []),
        battle_cards=battle_cards,
        error=result.get("error")
    )

@router.get("/{project_id}")
async def get_battle_cards(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get existing battle cards for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    if not project.battle_cards:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No battle cards found for this project"
        )
    
    return {
        "success": True,
        "competitors": project.battle_cards.get("competitors", []),
        "battle_cards": project.battle_cards.get("battle_cards", []),
        "analyzed_at": project.battle_cards.get("analyzed_at")
    }

