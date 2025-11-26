"""
Win/Loss Data Extractor Agent - Extracts win/loss reasons and RFP characteristics from project data.
"""
from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from utils.llm_factory import get_llm
from utils.model_router import TaskType
from utils.config import settings
import json
import re

class WinLossExtractorAgent:
    """Agent that extracts win/loss reasons and RFP characteristics from project data."""
    
    def __init__(self):
        self.llm = None
        self._initialize()
    
    def _initialize(self):
        """Initialize the LLM."""
        try:
            self.llm = get_llm(
                provider="gemini" if settings.LLM_PROVIDER == "gemini" else None,
                temperature=0.2,  # Low temperature for factual extraction
                task_type=TaskType.ANALYSIS
            )
            print(f"✓ Win/Loss Extractor Agent initialized")
        except Exception as e:
            print(f"Error initializing Win/Loss Extractor Agent: {e}")
    
    def extract(
        self,
        outcome: str,  # "won" or "lost"
        project_data: Dict[str, Any],
        insights_data: Optional[Dict[str, Any]] = None,
        proposal_data: Optional[Dict[str, Any]] = None,
        battle_cards: Optional[List[Dict[str, Any]]] = None,
        rfp_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract win/loss reasons and RFP characteristics from project data.
        
        Args:
            outcome: "won" or "lost"
            project_data: Project information (client_name, industry, region, etc.)
            insights_data: Insights data (executive_summary, challenges, value_propositions, etc.)
            proposal_data: Proposal content (sections, emphasis)
            battle_cards: Battle cards with competitor information
            rfp_text: RFP document text
        
        Returns:
            dict with:
            - win_reasons or loss_reasons (text)
            - rfp_characteristics (JSON dict with keywords, patterns, requirements)
            - competitor (main competitor name)
            - competitors (list of all competitors)
            - deal_size_estimate (if mentioned)
        """
        if not self.llm:
            return self._extract_basic_data(outcome, project_data, battle_cards)
        
        # Prepare context for analysis
        context_parts = []
        
        # Project context
        context_parts.append(f"Project: {project_data.get('name', 'Unknown')}")
        context_parts.append(f"Client: {project_data.get('client_name', 'Unknown')}")
        context_parts.append(f"Industry: {project_data.get('industry', 'Unknown')}")
        context_parts.append(f"Region: {project_data.get('region', 'Unknown')}")
        
        # Insights context
        if insights_data:
            if insights_data.get('executive_summary'):
                context_parts.append(f"\nExecutive Summary:\n{insights_data.get('executive_summary')[:500]}")
            if insights_data.get('challenges'):
                challenges_text = "\n".join([f"- {c.get('title', c) if isinstance(c, dict) else c}" for c in insights_data.get('challenges', [])[:5]])
                context_parts.append(f"\nKey Challenges:\n{challenges_text}")
            if insights_data.get('value_propositions'):
                vp_text = "\n".join([f"- {vp}" for vp in insights_data.get('value_propositions', [])[:5]])
                context_parts.append(f"\nValue Propositions:\n{vp_text}")
        
        # Proposal context
        if proposal_data:
            if proposal_data.get('sections'):
                sections_summary = []
                for section in proposal_data.get('sections', [])[:5]:
                    title = section.get('title', 'Untitled')
                    content_preview = section.get('content', '')[:200] if section.get('content') else ''
                    sections_summary.append(f"{title}: {content_preview}...")
                context_parts.append(f"\nProposal Sections:\n" + "\n".join(sections_summary))
        
        # Battle cards context
        competitors_list = []
        if battle_cards:
            for card in battle_cards:
                competitor = card.get('competitor', '')
                if competitor:
                    competitors_list.append(competitor)
                    weaknesses = card.get('weaknesses', [])
                    if weaknesses:
                        context_parts.append(f"\n{competitor} Weaknesses:\n" + "\n".join([f"- {w}" for w in weaknesses[:3]]))
        
        # RFP context
        if rfp_text:
            context_parts.append(f"\nRFP Text (excerpt):\n{rfp_text[:1000]}")
        
        context = "\n".join(context_parts)
        
        # Create prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a sales intelligence analyst. Analyze the provided project data to extract:
1. Why the deal was won or lost (specific reasons)
2. RFP characteristics (keywords, requirements patterns, industry signals)
3. Competitor information
4. Deal size if mentioned

Be specific and factual. Focus on what actually happened, not speculation."""),
            ("user", f"""Analyze this {outcome.upper()} deal:

{context}

Extract the following information:

1. {"Win Reasons" if outcome == "won" else "Loss Reasons"}: Provide 3-5 specific reasons why this deal was {outcome}. Be concrete and reference specific aspects from the data.

2. RFP Characteristics: Extract key patterns, keywords, and requirements from the RFP. Include:
   - Key requirements mentioned
   - Industry-specific signals
   - Technical requirements
   - Budget indicators (if any)
   - Timeline characteristics
   - Decision-making patterns

3. Competitor Information: Identify the main competitor and all competitors mentioned.

4. Deal Size: If any monetary value or budget range is mentioned, extract it.

Return your analysis as JSON:
{{
  "{'win_reasons' if outcome == 'won' else 'loss_reasons'}": "Detailed reasons (3-5 bullet points)",
  "rfp_characteristics": {{
    "keywords": ["keyword1", "keyword2"],
    "requirements": ["req1", "req2"],
    "industry_signals": ["signal1", "signal2"],
    "technical_requirements": ["tech1", "tech2"],
    "budget_indicators": ["indicator1"],
    "timeline_characteristics": ["characteristic1"]
  }},
  "competitor": "Main competitor name or null",
  "competitors": ["competitor1", "competitor2"],
  "deal_size_estimate": "Estimated value or null"
}}""")
        ])
        
        try:
            chain = prompt | self.llm
            response = chain.invoke({})
            
            # Parse response
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Try to extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                # Fallback: try to parse entire response as JSON
                result = json.loads(response_text)
            
            # Ensure required fields
            if outcome == "won":
                result.setdefault('win_reasons', '')
                result.pop('loss_reasons', None)
            else:
                result.setdefault('loss_reasons', '')
                result.pop('win_reasons', None)
            
            result.setdefault('rfp_characteristics', {})
            result.setdefault('competitor', None)
            result.setdefault('competitors', competitors_list if competitors_list else [])
            result.setdefault('deal_size_estimate', None)
            
            return result
            
        except Exception as e:
            print(f"[Win/Loss Extractor] Error: {e}")
            # Fallback to basic extraction
            return self._extract_basic_data(outcome, project_data, battle_cards)
    
    def _extract_basic_data(
        self,
        outcome: str,
        project_data: Dict[str, Any],
        battle_cards: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Extract basic data without AI analysis."""
        competitors_list = []
        main_competitor = None
        
        if battle_cards:
            for card in battle_cards:
                competitor = card.get('competitor', '')
                if competitor:
                    competitors_list.append(competitor)
                    if not main_competitor:
                        main_competitor = competitor
        
        result = {
            'rfp_characteristics': {
                'keywords': [],
                'requirements': [],
                'industry_signals': [project_data.get('industry', '')] if project_data.get('industry') else [],
                'technical_requirements': [],
                'budget_indicators': [],
                'timeline_characteristics': []
            },
            'competitor': main_competitor,
            'competitors': competitors_list,
            'deal_size_estimate': None
        }
        
        if outcome == "won":
            result['win_reasons'] = f"Deal won for {project_data.get('client_name', 'client')} in {project_data.get('industry', 'industry')}."
        else:
            result['loss_reasons'] = f"Deal lost for {project_data.get('client_name', 'client')} in {project_data.get('industry', 'industry')}."
        
        return result

# Global instance
win_loss_extractor_agent = WinLossExtractorAgent()
