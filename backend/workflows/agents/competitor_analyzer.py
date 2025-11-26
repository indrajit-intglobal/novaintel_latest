"""
Competitor Analyzer Agent - Detects competitors and generates battle cards.
"""
from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from utils.llm_factory import get_llm
from utils.model_router import TaskType
from utils.config import settings
from utils.gemini_service import gemini_service
import json
import re

class CompetitorAnalyzerAgent:
    """Agent that detects competitors and generates battle cards."""
    
    def __init__(self):
        self.llm = None
        self._initialize()
    
    def _initialize(self):
        """Initialize the LLM."""
        try:
            # Use Gemini
            self.llm = get_llm(
                provider="gemini",  # Force Gemini
                temperature=0.2,
                task_type=TaskType.ANALYSIS
            )
            print(f"✓ Competitor Analyzer Agent initialized")
        except Exception as e:
            print(f"Error initializing Competitor Analyzer Agent: {e}")
    
    def detect_competitors(self, rfp_text: str) -> List[str]:
        """Detect competitor mentions in RFP."""
        # Common competitor keywords
        competitor_keywords = [
            "salesforce", "hubspot", "sap", "oracle", "microsoft", "aws", "azure",
            "google cloud", "servicenow", "workday", "adobe", "ibm", "dell",
            "hp", "cisco", "vmware", "red hat", "splunk", "tableau", "palantir"
        ]
        
        detected = []
        rfp_lower = rfp_text.lower()
        
        for keyword in competitor_keywords:
            if keyword in rfp_lower:
                detected.append(keyword.title())
        
        return list(set(detected))  # Remove duplicates
    
    def generate_battle_card(
        self,
        competitor: str,
        industry: Optional[str] = None,
        rfp_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate battle card for a competitor using Google Search Grounding.
        
        Args:
            competitor: Competitor name
            industry: Industry context
            rfp_context: RFP requirements context
        
        Returns:
            dict with battle card data
        """
        if not gemini_service.is_available():
            return {
                "competitor": competitor,
                "weaknesses": [],
                "feature_gaps": [],
                "recommendations": [],
                "error": "Gemini service not available"
            }
        
        # Create search query for Google Search Grounding
        search_query = f"Weaknesses of {competitor}"
        if industry:
            search_query += f" for {industry} companies"
        if rfp_context:
            search_query += f" in {rfp_context[:100]}"
        
        prompt = f"""Generate a battle card for {competitor} based on market intelligence.

Search Query: {search_query}

Create a battle card with:
1. Key weaknesses relevant to RFP requirements
2. Feature gaps (what RFP asks for vs. competitor strengths)
3. Recommendations for proposal sections to highlight

Return JSON:
{{
  "competitor": "{competitor}",
  "weaknesses": ["weakness1", "weakness2"],
  "feature_gaps": ["gap1", "gap2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "detected_mentions": ["mention1", "mention2"]
}}"""
        
        try:
            # Use Gemini with Google Search Grounding (if available)
            # For now, use regular generation
            result = gemini_service.generate_content(
                prompt=prompt,
                system_instruction="You are a competitive intelligence analyst. Generate actionable battle cards.",
                temperature=0.2
            )
            
            if result.get("error"):
                return {
                    "competitor": competitor,
                    "weaknesses": [],
                    "feature_gaps": [],
                    "recommendations": [],
                    "error": result["error"]
                }
            
            # Parse response
            content = result.get("content", "")
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
            else:
                # Fallback
                parsed = {
                    "competitor": competitor,
                    "weaknesses": [f"{competitor} has limitations in this space"],
                    "feature_gaps": [],
                    "recommendations": [f"Highlight our advantages over {competitor}"]
                }
            
            return {
                "competitor": parsed.get("competitor", competitor),
                "weaknesses": parsed.get("weaknesses", []),
                "feature_gaps": parsed.get("feature_gaps", []),
                "recommendations": parsed.get("recommendations", []),
                "detected_mentions": parsed.get("detected_mentions", []),
                "error": None
            }
            
        except Exception as e:
            print(f"[Competitor Analyzer] Error: {e}")
            return {
                "competitor": competitor,
                "weaknesses": [],
                "feature_gaps": [],
                "recommendations": [],
                "error": str(e)
            }
    
    def analyze_rfp(
        self,
        rfp_text: str,
        rfp_summary: str,
        industry: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze RFP for competitors and generate battle cards.
        
        Returns:
            dict with 'competitors' (list) and 'battle_cards' (list of battle card dicts)
        """
        # Detect competitors
        competitors = self.detect_competitors(rfp_text)
        
        if not competitors:
            return {
                "competitors": [],
                "battle_cards": [],
                "error": None
            }
        
        # Generate battle cards for each competitor
        battle_cards = []
        for competitor in competitors:
            battle_card = self.generate_battle_card(
                competitor=competitor,
                industry=industry,
                rfp_context=rfp_summary[:500] if rfp_summary else None
            )
            battle_cards.append(battle_card)
        
        return {
            "competitors": competitors,
            "battle_cards": battle_cards,
            "error": None
        }

# Global instance
competitor_analyzer_agent = CompetitorAnalyzerAgent()

