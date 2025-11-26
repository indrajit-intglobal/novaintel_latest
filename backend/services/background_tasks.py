"""
Background Tasks - Async task handlers for win/loss records and ICP profile updates.
"""
import asyncio
from typing import Optional
from sqlalchemy.orm import Session
from db.database import SessionLocal
from models.project import Project, ProjectStatus
from models.icp_profile import ICPProfile
from services.win_loss_service import WinLossService
from services.icp_profile_service import ICPProfileService
from utils.config import settings

async def create_win_loss_record_task(project_id: int, outcome: str, user_id: int):
    """
    Background task to create win/loss record from project.
    
    Args:
        project_id: Project ID
        outcome: "won" or "lost"
        user_id: User/company ID
    """
    db: Session = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            print(f"[Background Task] Project {project_id} not found")
            return
        
        # Check if win/loss record already exists for this project
        from models.win_loss_data import WinLossData, DealOutcome
        existing_record = db.query(WinLossData).filter(
            WinLossData.deal_id == f"PROJ-{project_id}",
            WinLossData.company_id == user_id
        ).first()
        
        if existing_record:
            print(f"[Background Task] Win/Loss record already exists for project {project_id}")
            return
        
        # Create win/loss record
        if settings.ENABLE_AUTO_WIN_LOSS_RECORDS:
            print(f"[Background Task] Creating win/loss record for project {project_id} ({outcome})")
            win_loss_record = WinLossService.create_win_loss_record_from_project(
                db=db,
                project=project,
                outcome=outcome,
                user_id=user_id
            )
            
            if win_loss_record:
                print(f"[Background Task] Successfully created win/loss record {win_loss_record.id}")
                
                # If won, trigger ICP profile analysis
                if outcome == "won" and settings.ENABLE_AUTO_ICP_UPDATES:
                    await update_icp_profiles_task(user_id)
            else:
                print(f"[Background Task] Failed to create win/loss record for project {project_id}")
        else:
            print(f"[Background Task] Auto win/loss records are disabled")
            
    except Exception as e:
        print(f"[Background Task] Error creating win/loss record: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

async def update_icp_profiles_task(user_id: int):
    """
    Background task to analyze won deals and update ICP profiles.
    
    Args:
        user_id: User/company ID
    """
    db: Session = SessionLocal()
    try:
        if not settings.ENABLE_AUTO_ICP_UPDATES:
            print(f"[Background Task] Auto ICP updates are disabled")
            return
        
        print(f"[Background Task] Analyzing won deals for user {user_id} to update ICP profiles")
        
        # Analyze patterns
        analysis_result = ICPProfileService.analyze_won_deals_patterns(
            db=db,
            user_id=user_id,
            min_wins=settings.ICP_ANALYSIS_MIN_WINS
        )
        
        if 'message' in analysis_result:
            print(f"[Background Task] {analysis_result['message']}")
            return
        
        # Get existing ICP profiles for user
        icp_profiles = db.query(ICPProfile).filter(
            ICPProfile.company_id == user_id
        ).all()
        
        if not icp_profiles:
            print(f"[Background Task] No ICP profiles found for user {user_id}")
            return
        
        # Update matching ICP profiles
        suggested_updates = analysis_result.get('suggested_updates', {})
        if suggested_updates:
            # Find best matching ICP profile (by industry or create default)
            target_industry = suggested_updates.get('industry')
            
            matching_profile = None
            if target_industry:
                # Find profile with matching industry
                for profile in icp_profiles:
                    if profile.industry == target_industry:
                        matching_profile = profile
                        break
            
            # If no match, use first profile or create default
            if not matching_profile:
                matching_profile = icp_profiles[0] if icp_profiles else None
            
            if matching_profile:
                print(f"[Background Task] Updating ICP profile {matching_profile.id} ({matching_profile.name})")
                updated_profile = ICPProfileService.update_icp_profile_from_patterns(
                    db=db,
                    icp_profile=matching_profile,
                    patterns=analysis_result
                )
                print(f"[Background Task] Successfully updated ICP profile {updated_profile.id}")
        
        # Check for new profile suggestions
        new_suggestions = ICPProfileService.suggest_new_icp_profiles(
            db=db,
            user_id=user_id,
            patterns=analysis_result
        )
        
        if new_suggestions:
            print(f"[Background Task] Found {len(new_suggestions)} new ICP profile suggestions")
            # Could notify user or create them automatically
        
    except Exception as e:
        print(f"[Background Task] Error updating ICP profiles: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def run_async_task(coro):
    """Helper to run async tasks in background."""
    import threading
    def run_in_thread():
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(coro)
        except Exception as e:
            print(f"Error in background task thread: {e}")
        finally:
            loop.close()
    
    thread = threading.Thread(target=run_in_thread, daemon=True)
    thread.start()

