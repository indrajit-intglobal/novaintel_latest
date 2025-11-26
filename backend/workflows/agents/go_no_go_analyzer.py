"""
Go/No-Go Strategic Oracle Agent - Analyzes RFP against ICP and win/loss data.
"""
from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from utils.llm_factory import get_llm
from utils.model_router import TaskType
from utils.config import settings
import json
import re

class GoNoGoAnalyzerAgent:
    """Agent that performs Go/No-Go analysis using deep reasoning."""
    
    def __init__(self):
        self.llm = None
        self._initialize()
    
    def _initialize(self):
        """Initialize the LLM with reasoning mode."""
        try:
            # Use Gemini 2.0 Flash with reasoning mode
            self.llm = get_llm(
                provider="gemini" if settings.LLM_PROVIDER == "gemini" else None,
                temperature=0.1,  # Low temperature for factual analysis
                task_type=TaskType.COMPLEX_REASONING
            )
            print(f"✓ Go/No-Go Analyzer Agent initialized")
        except Exception as e:
            print(f"Error initializing Go/No-Go Analyzer Agent: {e}")
    
    def analyze(
        self,
        rfp_text: str,
        rfp_summary: str,
        icp_profile: Optional[Dict[str, Any]] = None,
        win_loss_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Perform Go/No-Go analysis.
        
        Args:
            rfp_text: Full RFP text
            rfp_summary: RFP summary
            icp_profile: ICP profile data
            win_loss_data: Historical win/loss data
        
        Returns:
            dict with 'score' (0-100), 'recommendation', 'risk_report', and 'error'
        """
        if not self.llm:
            return {
                "score": 50.0,
                "recommendation": "unknown",
                "risk_report": {},
                "error": "LLM not initialized"
            }
        
        # Format ICP data
        icp_text = ""
        if icp_profile:
            icp_text = f"""
ICP Profile: {icp_profile.get('name', 'Default')}
- Industry: {icp_profile.get('industry', 'Any')}
- Company Size: {icp_profile.get('company_size_min', 'N/A')}-{icp_profile.get('company_size_max', 'N/A')} employees
- Tech Stack: {', '.join(icp_profile.get('tech_stack', [])) if icp_profile.get('tech_stack') else 'Any'}
- Budget Range: ${icp_profile.get('budget_range_min', 'N/A')}-${icp_profile.get('budget_range_max', 'N/A')}
- Regions: {', '.join(icp_profile.get('geographic_regions', [])) if icp_profile.get('geographic_regions') else 'Any'}
"""
        
        # Format win/loss data
        win_loss_text = ""
        if win_loss_data:
            win_loss_text = "\nHistorical Win/Loss Data:\n"
            for deal in win_loss_data[:10]:  # Limit to 10 most relevant
                win_loss_text += f"""
- Client: {deal.get('client_name', 'Unknown')}
  Industry: {deal.get('industry', 'Unknown')}
  Outcome: {deal.get('outcome', 'Unknown')}
  Competitor: {deal.get('competitor', 'None')}
  Deal Size: ${deal.get('deal_size', 0):,.0f} if deal.get('deal_size') else 'Unknown'
  Win Reasons: {deal.get('win_reasons', 'N/A')}
  Loss Reasons: {deal.get('loss_reasons', 'N/A')}
"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a strategic procurement analyst. Analyze RFP opportunities using deep reasoning to identify "hidden signals" and assess bid viability.

Your analysis should consider:
1. ICP Alignment: How well does this RFP match our Ideal Customer Profile?
2. Win Probability: Based on historical data, what's our likelihood of winning?
3. Competitive Risk: Are there signals indicating preference for specific competitors?
4. Timeline/Scope Risk: Are there red flags in requirements or timeline?

Use reasoning mode to:
- Identify implicit requirements (e.g., "native SAP integration" → preference for SAP partners)
- Cross-reference RFP characteristics with historical win/loss patterns
- Detect competitive signals in language and requirements
- Assess alignment with ICP criteria

Return a JSON object with:
- score: 0-100 (overall Go/No-Go score)
- recommendation: "go", "no-go", or "conditional"
- alignment_score: 0-100 (ICP match)
- win_probability: 0-100 (based on historical data)
- competitive_risk: 0-100 (higher = more risk)
- timeline_scope_risk: 0-100 (higher = more risk)
- hidden_signals: List of detected signals
- risk_factors: List of risk factors
- opportunities: List of opportunities
- detailed_analysis: Detailed explanation"""),
            ("user", """Analyze this RFP opportunity:

RFP Summary:
{rfp_summary}

{icp_section}

{win_loss_section}

Return your analysis as JSON with the structure specified above.""")
        ])
        
        try:
            chain = prompt | self.llm
            response = chain.invoke({
                "rfp_summary": rfp_summary or "No summary available",
                "icp_section": icp_text or "No ICP profile available",
                "win_loss_section": win_loss_text or "No historical win/loss data available"
            })
            
            # Parse response
            content = str(response)
            
            # Try to extract JSON
            json_match = __import__("re").search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
            else:
                # Fallback: create basic analysis
                parsed = {
                    "score": 60.0,
                    "recommendation": "conditional",
                    "alignment_score": 70.0,
                    "win_probability": 50.0,
                    "competitive_risk": 50.0,
                    "timeline_scope_risk": 50.0,
                    "hidden_signals": [],
                    "risk_factors": ["Unable to parse full analysis"],
                    "opportunities": [],
                    "detailed_analysis": content[:500]
                }
            
            # Ensure all required fields
            result = {
                "score": float(parsed.get("score", 50.0)),
                "recommendation": parsed.get("recommendation", "conditional"),
                "alignment_score": float(parsed.get("alignment_score", 50.0)),
                "win_probability": float(parsed.get("win_probability", 50.0)),
                "competitive_risk": float(parsed.get("competitive_risk", 50.0)),
                "timeline_scope_risk": float(parsed.get("timeline_scope_risk", 50.0)),
                "hidden_signals": parsed.get("hidden_signals", []),
                "risk_factors": parsed.get("risk_factors", []),
                "opportunities": parsed.get("opportunities", []),
                "detailed_analysis": parsed.get("detailed_analysis", ""),
                "error": None
            }
            
            return result
            
        except Exception as e:
            print(f"[Go/No-Go Analyzer] Error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "score": 50.0,
                "recommendation": "unknown",
                "risk_report": {},
                "error": str(e)
            }

# Global instance
go_no_go_analyzer_agent = GoNoGoAnalyzerAgent()

