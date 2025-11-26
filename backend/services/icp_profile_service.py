"""
ICP Profile Service - Service layer for analyzing and updating ICP profiles.
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from models.icp_profile import ICPProfile
from models.project import Project, ProjectStatus
from models.win_loss_data import WinLossData, DealOutcome
from workflows.agents.icp_profile_analyzer import icp_profile_analyzer_agent
from utils.timezone import now_utc_from_ist

class ICPProfileService:
    """Service for managing ICP profiles."""
    
    @staticmethod
    def analyze_won_deals_patterns(
        db: Session,
        user_id: int,
        min_wins: int = 3
    ) -> Dict[str, Any]:
        """
        Analyze patterns in won deals for a user.
        
        Args:
            db: Database session
            user_id: User/company ID
            min_wins: Minimum number of won deals required for analysis
        
        Returns:
            Analysis results with patterns and suggested updates
        """
        # Get all won deals for user
        won_deals = db.query(WinLossData).filter(
            WinLossData.company_id == user_id,
            WinLossData.outcome == DealOutcome.WON
        ).all()
        
        if len(won_deals) < min_wins:
            return {
                'patterns': {},
                'suggested_updates': {},
                'new_profile_suggestions': [],
                'message': f'Need at least {min_wins} won deals for analysis. Currently have {len(won_deals)}.'
            }
        
        # Prepare won projects data
        won_projects_data = []
        for deal in won_deals:
            project_data = {
                'client_name': deal.client_name,
                'industry': deal.industry,
                'region': deal.region,
                'rfp_characteristics': deal.rfp_characteristics or {}
            }
            won_projects_data.append(project_data)
        
        # Analyze patterns using AI agent
        analysis_result = icp_profile_analyzer_agent.analyze_won_deals_patterns(
            won_projects_data
        )
        
        return analysis_result
    
    @staticmethod
    def update_icp_profile_from_patterns(
        db: Session,
        icp_profile: ICPProfile,
        patterns: Dict[str, Any]
    ) -> ICPProfile:
        """
        Update ICP profile based on identified patterns.
        
        Args:
            db: Database session
            icp_profile: ICP Profile to update
            patterns: Pattern analysis results
        
        Returns:
            Updated ICP Profile
        """
        suggested_updates = patterns.get('suggested_updates', {})
        
        # Update fields if suggested
        if 'industry' in suggested_updates and suggested_updates['industry']:
            icp_profile.industry = suggested_updates['industry']
        
        if 'geographic_regions' in suggested_updates and suggested_updates['geographic_regions']:
            icp_profile.geographic_regions = suggested_updates['geographic_regions']
        
        if 'tech_stack' in suggested_updates and suggested_updates['tech_stack']:
            icp_profile.tech_stack = suggested_updates['tech_stack']
        
        if 'company_size_min' in suggested_updates and suggested_updates['company_size_min']:
            icp_profile.company_size_min = suggested_updates['company_size_min']
        
        if 'company_size_max' in suggested_updates and suggested_updates['company_size_max']:
            icp_profile.company_size_max = suggested_updates['company_size_max']
        
        if 'budget_range_min' in suggested_updates and suggested_updates['budget_range_min']:
            icp_profile.budget_range_min = suggested_updates['budget_range_min']
        
        if 'budget_range_max' in suggested_updates and suggested_updates['budget_range_max']:
            icp_profile.budget_range_max = suggested_updates['budget_range_max']
        
        icp_profile.last_analyzed_at = now_utc_from_ist()
        
        db.commit()
        db.refresh(icp_profile)
        
        return icp_profile
    
    @staticmethod
    def suggest_new_icp_profiles(
        db: Session,
        user_id: int,
        patterns: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Get suggestions for new ICP profiles based on patterns.
        
        Args:
            db: Database session
            user_id: User/company ID
            patterns: Pattern analysis results
        
        Returns:
            List of suggested ICP profile dictionaries
        """
        suggestions = patterns.get('new_profile_suggestions', [])
        
        # Filter out suggestions that might already exist
        existing_profiles = db.query(ICPProfile).filter(
            ICPProfile.company_id == user_id
        ).all()
        
        existing_names = {profile.name for profile in existing_profiles}
        
        filtered_suggestions = []
        for suggestion in suggestions:
            if suggestion.get('name') not in existing_names:
                filtered_suggestions.append(suggestion)
        
        return filtered_suggestions

