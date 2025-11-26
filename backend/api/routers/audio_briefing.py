"""
Audio Briefing (Podcast Mode) API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from db.database import get_db
from models.user import User
from models.project import Project
from models.rfp_document import RFPDocument
from utils.dependencies import get_current_user
from workflows.agents.audio_briefing_generator import audio_briefing_generator_agent
from services.tts_service import tts_service
from utils.config import settings
import os

router = APIRouter()

class AudioBriefingRequest(BaseModel):
    """Request for audio briefing generation."""
    project_id: int
    rfp_document_id: int

class AudioBriefingResponse(BaseModel):
    """Response from audio briefing generation."""
    success: bool
    script: Optional[str] = None
    audio_url: Optional[str] = None
    error: Optional[str] = None

@router.post("/generate", response_model=AudioBriefingResponse)
async def generate_audio_briefing(
    request: AudioBriefingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate audio briefing (Podcast Mode) for an RFP.
    """
    if not settings.ENABLE_AUDIO_BRIEFING:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Audio briefing is disabled"
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
    
    # Get RFP summary from insights if available
    rfp_summary = ""
    if project.insights:
        insights_data = project.insights.insights_data or {}
        rfp_summary = insights_data.get("rfp_summary", "")
    
    if not rfp_summary:
        # Fallback: use first part of extracted text
        rfp_text = rfp_doc.extracted_text or ""
        rfp_summary = rfp_text[:2000] if len(rfp_text) > 2000 else rfp_text
    
    # Generate script
    script_result = audio_briefing_generator_agent.generate_script(
        rfp_summary=rfp_summary,
        client_name=project.client_name,
        deal_size=None,  # Could extract from RFP or project
        timeline=None  # Could extract from RFP
    )
    
    if script_result.get("error") or not script_result.get("script"):
        return AudioBriefingResponse(
            success=False,
            error=script_result.get("error", "Failed to generate script")
        )
    
    script = script_result.get("script")
    
    # Generate audio
    audio_dir = Path(settings.UPLOAD_DIR) / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    audio_filename = f"briefing_{request.project_id}_{request.rfp_document_id}.mp3"
    audio_path = audio_dir / audio_filename
    
    audio_result = tts_service.generate_audio(
        text=script,
        output_path=str(audio_path),
        language="en-US"
    )
    
    audio_url = None
    if audio_result.get("success") and audio_result.get("file_path"):
        # Save URL to project
        audio_url = f"/uploads/audio/{audio_filename}"
        project.audio_briefing_url = audio_url
        project.audio_briefing_script = script
        db.commit()
    else:
        # If audio generation failed, still save script
        project.audio_briefing_script = script
        db.commit()
    
    return AudioBriefingResponse(
        success=True,
        script=script,
        audio_url=audio_url,
        error=audio_result.get("error") if not audio_result.get("success") else None
    )

@router.get("/{project_id}")
async def get_audio_briefing(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get existing audio briefing for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return {
        "success": True,
        "script": project.audio_briefing_script,
        "audio_url": project.audio_briefing_url
    }

@router.get("/{project_id}/download")
async def download_audio_briefing(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download audio briefing file."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == current_user.id
    ).first()
    
    if not project or not project.audio_briefing_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio briefing not found"
        )
    
    # Remove /uploads prefix if present
    audio_path = project.audio_briefing_url.replace("/uploads/", "")
    full_path = Path(settings.UPLOAD_DIR) / audio_path
    
    if not full_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found"
        )
    
    return FileResponse(
        path=str(full_path),
        media_type="audio/mpeg",
        filename=f"briefing_{project_id}.mp3"
    )

