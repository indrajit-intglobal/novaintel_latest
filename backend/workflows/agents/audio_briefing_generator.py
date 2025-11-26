"""
Audio Briefing Generator Agent - Generates conversational scripts for executives.
"""
from typing import Dict, Any, Optional
from langchain_core.prompts import ChatPromptTemplate
from utils.llm_factory import get_llm
from utils.model_router import TaskType
from utils.config import settings

class AudioBriefingGeneratorAgent:
    """Agent that generates conversational audio briefing scripts."""
    
    def __init__(self):
        self.llm = None
        self._initialize()
    
    def _initialize(self):
        """Initialize the LLM."""
        try:
            # Use Gemini Flash for fast generation
            self.llm = get_llm(
                provider="gemini",  # Force Gemini
                temperature=0.3,  # Slightly higher for conversational tone
                task_type=TaskType.FAST_GENERATION
            )
            print(f"✓ Audio Briefing Generator Agent initialized")
        except Exception as e:
            print(f"Error initializing Audio Briefing Generator Agent: {e}")
    
    def generate_script(
        self,
        rfp_summary: str,
        client_name: Optional[str] = None,
        deal_size: Optional[float] = None,
        timeline: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate conversational audio briefing script.
        
        Args:
            rfp_summary: RFP summary
            client_name: Client name
            deal_size: Estimated deal size
            timeline: Project timeline
        
        Returns:
            dict with 'script' (text) and 'error'
        """
        if not self.llm:
            return {
                "script": None,
                "error": "LLM not initialized"
            }
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an executive briefing assistant. Generate a conversational, executive-friendly audio script (2-3 minutes when spoken).

Tone: Professional but conversational, like briefing a team
Format: Natural speech, not bullet points
Length: ~300-400 words (2-3 minutes audio)

Include:
- Deal overview (client, size, timeline)
- Key requirements
- Risks and opportunities
- Next steps

Start with: "Hey team, here is the summary of the [Client] RFP..."
Use natural transitions and conversational language."""),
            ("user", """Generate an audio briefing script for this RFP:

RFP Summary:
{rfp_summary}

Client: {client_name}
Deal Size: {deal_size}
Timeline: {timeline}

Create a conversational script that executives can listen to.""")
        ])
        
        try:
            chain = prompt | self.llm
            response = chain.invoke({
                "rfp_summary": rfp_summary or "RFP requirements",
                "client_name": client_name or "the client",
                "deal_size": f"${deal_size:,.0f}" if deal_size else "TBD",
                "timeline": timeline or "TBD"
            })
            
            script = str(response)
            
            # Ensure it starts conversationally
            if not script.lower().startswith(("hey", "hi", "hello", "team")):
                script = f"Hey team, {script}"
            
            return {
                "script": script,
                "error": None
            }
            
        except Exception as e:
            print(f"[Audio Briefing Generator] Error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "script": None,
                "error": str(e)
            }

# Global instance
audio_briefing_generator_agent = AudioBriefingGeneratorAgent()

