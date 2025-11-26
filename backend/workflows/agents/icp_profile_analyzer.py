"""
ICP Profile Analyzer Agent - Analyzes won deals to identify patterns and update ICP profiles.
"""
from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from utils.llm_factory import get_llm
from utils.model_router import TaskType
from utils.config import settings
import json
import re

class ICPProfileAnalyzerAgent:
    """Agent that analyzes won deals to identify patterns and update ICP profiles."""
    
    def __init__(self):
        self.llm = None
        self._initialize()
    
    def _initialize(self):
        """Initialize the LLM."""
        try:
            self.llm = get_llm(
                provider="gemini" if settings.LLM_PROVIDER == "gemini" else None,
                temperature=0.2,  # Low temperature for pattern analysis
                task_type=TaskType.ANALYSIS
            )
            print(f"✓ ICP Profile Analyzer Agent initialized")
        except Exception as e:
            print(f"Error initializing ICP Profile Analyzer Agent: {e}")
    
    def analyze_won_deals_patterns(
        self,
        won_projects: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze won deals to identify patterns for ICP profile updates.
        
        Args:
            won_projects: List of won project data dictionaries with:
                - client_name, industry, region
                - insights (optional)
                - battle_cards (optional)
                - rfp_characteristics (optional)
        
        Returns:
            dict with:
            - patterns: Identified patterns (industry, company_size, tech_stack, regions, budget)
            - suggested_updates: Suggested ICP profile updates
            - new_profile_suggestions: Suggestions for new ICP profiles if distinct patterns emerge
        """
        if not won_projects or len(won_projects) == 0:
            return {
                'patterns': {},
                'suggested_updates': {},
                'new_profile_suggestions': []
            }
        
        if not self.llm:
            return self._analyze_basic_patterns(won_projects)
        
        # Prepare analysis data
        analysis_data = []
        for project in won_projects:
            project_info = {
                'client_name': project.get('client_name', ''),
                'industry': project.get('industry', ''),
                'region': project.get('region', ''),
                'rfp_characteristics': project.get('rfp_characteristics', {})
            }
            analysis_data.append(project_info)
        
        # Create prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a strategic sales analyst. Analyze won deals to identify patterns that define ideal customer profiles.

Identify:
1. Common industry patterns
2. Company size ranges (if inferable)
3. Tech stack preferences (from RFP characteristics)
4. Geographic regions
5. Budget indicators
6. RFP requirement patterns

Be specific and data-driven. Only identify patterns that are clearly present in the data."""),
            ("user", f"""Analyze these {len(won_projects)} won deals to identify ICP patterns:

{json.dumps(analysis_data, indent=2)}

Identify patterns and suggest ICP profile updates. Return JSON:
{{
  "patterns": {{
    "industries": ["industry1", "industry2"],
    "regions": ["region1", "region2"],
    "tech_stack": ["tech1", "tech2"],
    "company_size_range": {{"min": 100, "max": 1000}},
    "budget_range": {{"min": 50000, "max": 500000}},
    "common_rfp_requirements": ["req1", "req2"]
  }},
  "suggested_updates": {{
    "industry": "Most common industry or null",
    "geographic_regions": ["region1", "region2"],
    "tech_stack": ["tech1", "tech2"],
    "company_size_min": 100,
    "company_size_max": 1000,
    "budget_range_min": 50000,
    "budget_range_max": 500000
  }},
  "new_profile_suggestions": [
    {{
      "name": "Profile name",
      "reason": "Why this is a distinct pattern",
      "criteria": {{"industry": "...", "regions": [...]}}
    }}
  ]
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
                result = json.loads(response_text)
            
            # Ensure required fields
            result.setdefault('patterns', {})
            result.setdefault('suggested_updates', {})
            result.setdefault('new_profile_suggestions', [])
            
            return result
            
        except Exception as e:
            print(f"[ICP Profile Analyzer] Error: {e}")
            # Fallback to basic analysis
            return self._analyze_basic_patterns(won_projects)
    
    def _analyze_basic_patterns(
        self,
        won_projects: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze basic patterns without AI."""
        industries = []
        regions = []
        tech_stack = []
        
        for project in won_projects:
            if project.get('industry'):
                industries.append(project.get('industry'))
            if project.get('region'):
                regions.append(project.get('region'))
            
            rfp_chars = project.get('rfp_characteristics', {})
            if isinstance(rfp_chars, dict):
                tech_reqs = rfp_chars.get('technical_requirements', [])
                if tech_reqs:
                    tech_stack.extend(tech_reqs)
        
        # Get most common values
        from collections import Counter
        industry_counter = Counter(industries)
        region_counter = Counter(regions)
        
        patterns = {
            'industries': [item[0] for item in industry_counter.most_common(3)],
            'regions': [item[0] for item in region_counter.most_common(3)],
            'tech_stack': list(set(tech_stack))[:10]
        }
        
        suggested_updates = {}
        if patterns['industries']:
            suggested_updates['industry'] = patterns['industries'][0]
        if patterns['regions']:
            suggested_updates['geographic_regions'] = patterns['regions']
        if patterns['tech_stack']:
            suggested_updates['tech_stack'] = patterns['tech_stack']
        
        return {
            'patterns': patterns,
            'suggested_updates': suggested_updates,
            'new_profile_suggestions': []
        }

# Global instance
icp_profile_analyzer_agent = ICPProfileAnalyzerAgent()

