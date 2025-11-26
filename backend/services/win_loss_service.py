"""
Win/Loss Service - Service layer for creating and managing win/loss records.
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from models.win_loss_data import WinLossData, DealOutcome
from models.project import Project
from models.insights import Insights
from models.proposal import Proposal
from models.rfp_document import RFPDocument
from workflows.agents.win_loss_extractor import win_loss_extractor_agent
from utils.timezone import now_utc_from_ist

class WinLossService:
    """Service for managing win/loss records."""
    
    @staticmethod
    def extract_rfp_characteristics(
        project: Project,
        insights: Optional[Insights] = None,
        rfp_doc: Optional[RFPDocument] = None
    ) -> Dict[str, Any]:
        """Extract RFP characteristics from project data."""
        characteristics = {
            'keywords': [],
            'requirements': [],
            'industry_signals': [project.industry] if project.industry else [],
            'technical_requirements': [],
            'budget_indicators': [],
            'timeline_characteristics': []
        }
        
        if insights:
            if insights.executive_summary:
                # Extract keywords from executive summary
                summary_lower = insights.executive_summary.lower()
                tech_keywords = ['api', 'integration', 'cloud', 'saas', 'platform', 'database', 'security']
                for keyword in tech_keywords:
                    if keyword in summary_lower:
                        characteristics['technical_requirements'].append(keyword)
        
        if rfp_doc and rfp_doc.extracted_text:
            text_lower = rfp_doc.extracted_text.lower()
            # Extract budget indicators
            budget_keywords = ['budget', 'cost', 'price', 'investment', 'value', '$', 'usd']
            for keyword in budget_keywords:
                if keyword in text_lower:
                    characteristics['budget_indicators'].append(keyword)
        
        return characteristics
    
    @staticmethod
    def get_competitors_from_battle_cards(battle_cards: Optional[Dict[str, Any]]) -> List[str]:
        """Extract competitor list from battle cards."""
        if not battle_cards:
            return []
        
        competitors = battle_cards.get('competitors', [])
        if isinstance(competitors, list):
            return competitors
        
        # Extract from battle_cards list
        battle_cards_list = battle_cards.get('battle_cards', [])
        if isinstance(battle_cards_list, list):
            competitor_list = []
            for card in battle_cards_list:
                if isinstance(card, dict):
                    competitor = card.get('competitor', '')
                    if competitor:
                        competitor_list.append(competitor)
            return competitor_list
        
        return []
    
    @staticmethod
    def create_win_loss_record_from_project(
        db: Session,
        project: Project,
        outcome: str,  # "won" or "lost"
        user_id: int
    ) -> Optional[WinLossData]:
        """
        Create win/loss record from project data using AI agent.
        
        Args:
            db: Database session
            project: Project object
            outcome: "won" or "lost"
            user_id: User/company ID
        
        Returns:
            Created WinLossData record or None if creation failed
        """
        try:
            # Get related data
            insights = project.insights
            proposals = project.proposals
            rfp_docs = project.rfp_documents
            
            # Get first proposal if available
            proposal = proposals[0] if proposals else None
            
            # Get first RFP document if available
            rfp_doc = rfp_docs[0] if rfp_docs else None
            
            # Prepare data for AI agent
            project_data = {
                'name': project.name,
                'client_name': project.client_name,
                'industry': project.industry,
                'region': project.region
            }
            
            insights_data = None
            if insights:
                insights_data = {
                    'executive_summary': insights.executive_summary,
                    'challenges': insights.challenges,
                    'value_propositions': insights.value_propositions
                }
            
            proposal_data = None
            if proposal and proposal.sections:
                proposal_data = {
                    'sections': proposal.sections
                }
            
            battle_cards = project.battle_cards if project.battle_cards else None
            battle_cards_list = None
            if battle_cards and isinstance(battle_cards, dict):
                battle_cards_list = battle_cards.get('battle_cards', [])
            
            rfp_text = None
            if rfp_doc and rfp_doc.extracted_text:
                rfp_text = rfp_doc.extracted_text
            
            # Extract data using AI agent
            extracted_data = win_loss_extractor_agent.extract(
                outcome=outcome,
                project_data=project_data,
                insights_data=insights_data,
                proposal_data=proposal_data,
                battle_cards=battle_cards_list,
                rfp_text=rfp_text
            )
            
            # Get competitor information
            competitors = extracted_data.get('competitors', [])
            if not competitors and battle_cards:
                competitors = WinLossService.get_competitors_from_battle_cards(battle_cards)
            
            main_competitor = extracted_data.get('competitor')
            if not main_competitor and competitors:
                main_competitor = competitors[0] if competitors else None
            
            # Get deal size estimate
            deal_size_estimate = extracted_data.get('deal_size_estimate')
            deal_size = None
            if deal_size_estimate:
                # Try to extract numeric value
                import re
                numbers = re.findall(r'\d+[,\d]*', str(deal_size_estimate))
                if numbers:
                    try:
                        deal_size = float(numbers[0].replace(',', ''))
                    except:
                        pass
            
            # Create win/loss record
            win_loss_record = WinLossData(
                company_id=user_id,
                deal_id=f"PROJ-{project.id}",  # Use project ID as deal ID
                client_name=project.client_name,
                industry=project.industry,
                region=project.region,
                competitor=main_competitor,
                competitors=competitors if competitors else None,
                outcome=DealOutcome.WON if outcome == "won" else DealOutcome.LOST,
                deal_size=deal_size,
                deal_date=now_utc_from_ist(),
                win_reasons=extracted_data.get('win_reasons') if outcome == "won" else None,
                loss_reasons=extracted_data.get('loss_reasons') if outcome == "lost" else None,
                rfp_characteristics=extracted_data.get('rfp_characteristics', {}),
                auto_generated=True
            )
            
            db.add(win_loss_record)
            db.commit()
            db.refresh(win_loss_record)
            
            return win_loss_record
            
        except Exception as e:
            print(f"Error creating win/loss record: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            return None

