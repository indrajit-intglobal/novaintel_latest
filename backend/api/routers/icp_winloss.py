"""
ICP Profiles and Win/Loss Data management API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from db.database import get_db
from models.user import User
from models.icp_profile import ICPProfile
from models.win_loss_data import WinLossData, DealOutcome
from utils.dependencies import get_current_user
from services.icp_profile_service import ICPProfileService
from services.background_tasks import update_icp_profiles_task, run_async_task
from utils.config import settings

router = APIRouter()

# ICP Profile Schemas
class ICPProfileCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    company_size_min: Optional[int] = None
    company_size_max: Optional[int] = None
    tech_stack: Optional[List[str]] = None
    budget_range_min: Optional[int] = None
    budget_range_max: Optional[int] = None
    geographic_regions: Optional[List[str]] = None
    additional_criteria: Optional[Dict[str, Any]] = None

class ICPProfileUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    company_size_min: Optional[int] = None
    company_size_max: Optional[int] = None
    tech_stack: Optional[List[str]] = None
    budget_range_min: Optional[int] = None
    budget_range_max: Optional[int] = None
    geographic_regions: Optional[List[str]] = None
    additional_criteria: Optional[Dict[str, Any]] = None

# Win/Loss Data Schemas
class WinLossDataCreate(BaseModel):
    deal_id: Optional[str] = None
    client_name: str
    industry: Optional[str] = None
    region: Optional[str] = None
    competitor: Optional[str] = None
    competitors: Optional[List[str]] = None
    outcome: str  # "won", "lost", "no_decision", "cancelled"
    deal_size: Optional[float] = None
    deal_date: Optional[str] = None
    win_reasons: Optional[str] = None
    loss_reasons: Optional[str] = None
    rfp_characteristics: Optional[Dict[str, Any]] = None

class WinLossDataUpdate(BaseModel):
    client_name: Optional[str] = None
    industry: Optional[str] = None
    region: Optional[str] = None
    competitor: Optional[str] = None
    competitors: Optional[List[str]] = None
    outcome: Optional[str] = None
    deal_size: Optional[float] = None
    deal_date: Optional[str] = None
    win_reasons: Optional[str] = None
    loss_reasons: Optional[str] = None
    rfp_characteristics: Optional[Dict[str, Any]] = None

# ICP Profile Endpoints
@router.post("/icp-profiles")
async def create_icp_profile(
    profile: ICPProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ICP profile."""
    icp = ICPProfile(
        company_id=current_user.id,
        name=profile.name,
        industry=profile.industry,
        company_size_min=profile.company_size_min,
        company_size_max=profile.company_size_max,
        tech_stack=profile.tech_stack,
        budget_range_min=profile.budget_range_min,
        budget_range_max=profile.budget_range_max,
        geographic_regions=profile.geographic_regions,
        additional_criteria=profile.additional_criteria
    )
    db.add(icp)
    db.commit()
    db.refresh(icp)
    return icp

@router.get("/icp-profiles")
async def list_icp_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all ICP profiles for the current user."""
    profiles = db.query(ICPProfile).filter(
        ICPProfile.company_id == current_user.id
    ).all()
    return profiles

@router.get("/icp-profiles/{profile_id}")
async def get_icp_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific ICP profile."""
    profile = db.query(ICPProfile).filter(
        ICPProfile.id == profile_id,
        ICPProfile.company_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ICP profile not found"
        )
    
    return profile

@router.put("/icp-profiles/{profile_id}")
async def update_icp_profile(
    profile_id: int,
    profile_update: ICPProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an ICP profile."""
    profile = db.query(ICPProfile).filter(
        ICPProfile.id == profile_id,
        ICPProfile.company_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ICP profile not found"
        )
    
    # Update fields
    for field, value in profile_update.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    return profile

@router.delete("/icp-profiles/{profile_id}")
async def delete_icp_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an ICP profile."""
    profile = db.query(ICPProfile).filter(
        ICPProfile.id == profile_id,
        ICPProfile.company_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ICP profile not found"
        )
    
    db.delete(profile)
    db.commit()
    return {"success": True}

# Win/Loss Data Endpoints
@router.post("/win-loss-data")
async def create_win_loss_data(
    data: WinLossDataCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new win/loss data entry."""
    from datetime import datetime
    
    deal_date = None
    if data.deal_date:
        try:
            deal_date = datetime.fromisoformat(data.deal_date.replace("Z", "+00:00"))
        except:
            pass
    
    win_loss = WinLossData(
        company_id=current_user.id,
        deal_id=data.deal_id,
        client_name=data.client_name,
        industry=data.industry,
        region=data.region,
        competitor=data.competitor,
        competitors=data.competitors,
        outcome=DealOutcome(data.outcome),
        deal_size=data.deal_size,
        deal_date=deal_date,
        win_reasons=data.win_reasons,
        loss_reasons=data.loss_reasons,
        rfp_characteristics=data.rfp_characteristics
    )
    db.add(win_loss)
    db.commit()
    db.refresh(win_loss)
    return win_loss

@router.get("/win-loss-data")
async def list_win_loss_data(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List win/loss data for the current user."""
    data = db.query(WinLossData).filter(
        WinLossData.company_id == current_user.id
    ).order_by(WinLossData.deal_date.desc() if WinLossData.deal_date else WinLossData.created_at.desc()).limit(limit).all()
    return data

@router.get("/win-loss-data/{data_id}")
async def get_win_loss_data(
    data_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific win/loss data entry."""
    data = db.query(WinLossData).filter(
        WinLossData.id == data_id,
        WinLossData.company_id == current_user.id
    ).first()
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Win/loss data not found"
        )
    
    return data

@router.put("/win-loss-data/{data_id}")
async def update_win_loss_data(
    data_id: int,
    data_update: WinLossDataUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update win/loss data."""
    win_loss = db.query(WinLossData).filter(
        WinLossData.id == data_id,
        WinLossData.company_id == current_user.id
    ).first()
    
    if not win_loss:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Win/loss data not found"
        )
    
    # Update fields
    for field, value in data_update.model_dump(exclude_unset=True).items():
        if field == "outcome" and value:
            setattr(win_loss, field, DealOutcome(value))
        elif field == "deal_date" and value:
            try:
                from datetime import datetime
                deal_date = datetime.fromisoformat(value.replace("Z", "+00:00"))
                setattr(win_loss, field, deal_date)
            except:
                pass
        else:
            setattr(win_loss, field, value)
    
    db.commit()
    db.refresh(win_loss)
    return win_loss

@router.delete("/win-loss-data/{data_id}")
async def delete_win_loss_data(
    data_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete win/loss data."""
    win_loss = db.query(WinLossData).filter(
        WinLossData.id == data_id,
        WinLossData.company_id == current_user.id
    ).first()
    
    if not win_loss:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Win/loss data not found"
        )
    
    db.delete(win_loss)
    db.commit()
    return {"success": True}

# Optional endpoints for auto-update features

@router.post("/icp-profiles/analyze")
async def analyze_icp_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger ICP profile analysis based on won deals.
    """
    try:
        # Trigger background task
        from services.background_tasks import run_async_task
        run_async_task(update_icp_profiles_task(current_user.id))
        
        return {
            "success": True,
            "message": "ICP profile analysis started in background"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting ICP analysis: {str(e)}"
        )

@router.get("/win-loss-data/auto-generated")
async def get_auto_generated_win_loss_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 100
):
    """
    Get auto-generated win/loss records.
    """
    win_loss_records = db.query(WinLossData).filter(
        WinLossData.company_id == current_user.id,
        WinLossData.auto_generated == True
    ).order_by(WinLossData.created_at.desc()).limit(limit).all()
    
    return [
        {
            "id": record.id,
            "deal_id": record.deal_id,
            "client_name": record.client_name,
            "industry": record.industry,
            "region": record.region,
            "competitor": record.competitor,
            "competitors": record.competitors,
            "outcome": record.outcome.value if record.outcome else None,
            "deal_size": record.deal_size,
            "deal_date": record.deal_date.isoformat() if record.deal_date else None,
            "win_reasons": record.win_reasons,
            "loss_reasons": record.loss_reasons,
            "rfp_characteristics": record.rfp_characteristics,
            "auto_generated": record.auto_generated,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None
        }
        for record in win_loss_records
    ]

@router.get("/icp-profiles/{profile_id}/suggestions")
async def get_icp_profile_suggestions(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get suggested updates for an ICP profile based on won deals analysis.
    """
    icp_profile = db.query(ICPProfile).filter(
        ICPProfile.id == profile_id,
        ICPProfile.company_id == current_user.id
    ).first()
    
    if not icp_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ICP profile not found"
        )
    
    # Analyze won deals
    analysis_result = ICPProfileService.analyze_won_deals_patterns(
        db=db,
        user_id=current_user.id,
        min_wins=settings.ICP_ANALYSIS_MIN_WINS
    )
    
    if 'message' in analysis_result:
        return {
            "suggested_updates": {},
            "new_profile_suggestions": [],
            "message": analysis_result['message']
        }
    
    # Get suggestions for new profiles
    new_suggestions = ICPProfileService.suggest_new_icp_profiles(
        db=db,
        user_id=current_user.id,
        patterns=analysis_result
    )
    
    return {
        "suggested_updates": analysis_result.get('suggested_updates', {}),
        "new_profile_suggestions": new_suggestions,
        "patterns": analysis_result.get('patterns', {})
    }

