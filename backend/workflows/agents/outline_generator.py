"""
Outline Generator Agent - Generates proposal skeleton (structure/headers only).
"""
from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from utils.llm_factory import get_llm
from utils.model_router import TaskType
from utils.config import settings
from pydantic import BaseModel, Field

class ProposalOutline(BaseModel):
    """Proposal outline structure."""
    sections: List[Dict[str, Any]] = Field(description="List of proposal sections with headers and brief descriptions")
    
    class Section(BaseModel):
        section_key: str = Field(description="Section identifier (e.g., 'executive_summary')")
        title: str = Field(description="Section title/header")
        description: str = Field(description="Brief description of what will be in this section")
        order: int = Field(description="Section order number")

class OutlineGeneratorAgent:
    """Agent that generates proposal outline/skeleton."""
    
    def __init__(self):
        self.llm = None
        self._initialize()
    
    def _initialize(self):
        """Initialize the LLM."""
        try:
            # Use Gemini Flash for fast generation
            self.llm = get_llm(
                provider="gemini" if settings.LLM_PROVIDER == "gemini" else None,
                temperature=0.2,
                task_type=TaskType.FAST_GENERATION
            )
            print(f"✓ Outline Generator Agent initialized")
        except Exception as e:
            print(f"Error initializing Outline Generator Agent: {e}")
    
    def generate_outline(
        self,
        rfp_summary: str,
        challenges: List[Dict[str, Any]] = None,
        value_propositions: List[str] = None
    ) -> Dict[str, Any]:
        """
        Generate proposal outline (skeleton) with section headers only.
        
        Args:
            rfp_summary: RFP summary
            challenges: List of challenges
            value_propositions: List of value propositions
        
        Returns:
            dict with 'outline' (list of sections) and 'error'
        """
        if not self.llm:
            return {
                "outline": None,
                "error": "LLM not initialized"
            }
        
        # Standard 13-section proposal structure
        standard_sections = [
            {"key": "executive_summary", "title": "Executive Summary", "order": 1},
            {"key": "understanding_client_needs", "title": "Understanding of Client Needs", "order": 2},
            {"key": "proposed_solution", "title": "Proposed Solution", "order": 3},
            {"key": "solution_architecture", "title": "Solution Architecture & Technology Stack", "order": 4},
            {"key": "business_value_use_cases", "title": "Business Value & Use Cases", "order": 5},
            {"key": "benefits_roi", "title": "Benefits and ROI Justification", "order": 6},
            {"key": "implementation_roadmap", "title": "Implementation Roadmap & Timeline", "order": 7},
            {"key": "change_management_training", "title": "Change Management & Training Strategy", "order": 8},
            {"key": "security_compliance", "title": "Security, Compliance & Data Governance", "order": 9},
            {"key": "case_studies_credentials", "title": "Case Studies & Delivery Credentials", "order": 10},
            {"key": "commercial_model", "title": "Commercial Model & Licensing Options", "order": 11},
            {"key": "risks_assumptions", "title": "Risks, Assumptions & Mitigation", "order": 12},
            {"key": "next_steps_cta", "title": "Next Steps & Call-to-Action", "order": 13}
        ]
        
        # Format challenges and value props for context
        challenges_text = ""
        if challenges:
            challenges_text = "\n".join([
                f"- {ch.get('challenge', ch.get('description', ''))}"
                for ch in challenges[:5]  # Limit to top 5
            ])
        
        value_props_text = ""
        if value_propositions:
            value_props_text = "\n".join([f"- {vp}" for vp in value_propositions[:5]])
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert proposal writer. Generate a proposal outline (skeleton) with section headers and brief descriptions.

The outline should follow the standard 13-section structure but customize descriptions based on the RFP requirements.

Return a JSON object with a 'sections' array. Each section should have:
- section_key: The section identifier (e.g., 'executive_summary')
- title: The section title
- description: A brief 1-2 sentence description of what will be covered in this section
- order: The section order number (1-13)

Focus on making the descriptions relevant to the specific RFP requirements."""),
            ("user", """Generate a proposal outline based on:

RFP Summary:
{rfp_summary}

Key Challenges:
{challenges}

Value Propositions:
{value_propositions}

Return the outline as JSON with the 'sections' array containing all 13 sections with customized descriptions.""")
        ])
        
        try:
            # Use simple JSON parsing instead of Pydantic for flexibility
            chain = prompt | self.llm
            response = chain.invoke({
                "rfp_summary": rfp_summary or "General RFP requirements",
                "challenges": challenges_text or "General business requirements",
                "value_propositions": value_props_text or "Our solution addresses key requirements"
            })
            
            # Parse response
            content = str(response)
            
            # Try to extract JSON
            import json
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                sections = parsed.get("sections", [])
            else:
                # Fallback: use standard sections with default descriptions
                sections = standard_sections
            
            # Ensure all 13 sections are present
            if len(sections) < 13:
                # Fill missing sections from standard structure
                existing_keys = {s.get("section_key", s.get("key")) for s in sections}
                for std_section in standard_sections:
                    if std_section["key"] not in existing_keys:
                        sections.append({
                            "section_key": std_section["key"],
                            "title": std_section["title"],
                            "description": f"Content for {std_section['title']}",
                            "order": std_section["order"]
                        })
            
            # Sort by order
            sections.sort(key=lambda x: x.get("order", x.get("section_key", "")))
            
            return {
                "outline": sections,
                "error": None
            }
            
        except Exception as e:
            print(f"[Outline Generator] Error: {e}")
            import traceback
            traceback.print_exc()
            # Fallback to standard sections
            return {
                "outline": [
                    {
                        "section_key": s["key"],
                        "title": s["title"],
                        "description": f"Content for {s['title']}",
                        "order": s["order"]
                    }
                    for s in standard_sections
                ],
                "error": str(e)
            }

# Global instance
outline_generator_agent = OutlineGeneratorAgent()

