"""
LangGraph workflow for multi-agent presales pipeline.
"""
from typing import Dict, Any
from langgraph.graph import StateGraph, END
from workflows.state import WorkflowState, create_initial_state
from workflows.agents import (
    rfp_analyzer_agent,
    challenge_extractor_agent,
    discovery_question_agent,
    value_proposition_agent,
    case_study_matcher_agent,
    proposal_builder_agent,
    outline_generator_agent
)
from workflows.agents.competitor_analyzer import competitor_analyzer_agent
from workflows.agents.proposal_refiner import proposal_refiner_agent
from utils.config import settings
from utils.websocket_manager import global_ws_manager
from utils.thought_logger import log_thought_sync

def rfp_analyzer_node(state: WorkflowState) -> Dict[str, Any]:
    """RFP Analyzer Agent node."""
    import sys
    sys.stdout.flush()
    print(f"  [RFP Analyzer] Starting...", flush=True)
    updates = {"current_step": "rfp_analyzer"}
    project_id = state.get("project_id")
    
    try:
        # Log thought
        log_thought_sync(project_id, None, "rfp_analyzer", "Starting RFP analysis...")
        # Get RFP text if not in state
        rfp_text = state.get("rfp_text")
        if not rfp_text:
            # Try to get from state context (passed from workflow manager)
            rfp_text = state.get("rfp_text", "")
        
        print(f"  [RFP Analyzer] RFP text length: {len(rfp_text) if rfp_text else 0}", flush=True)
        if not rfp_text or len(rfp_text) == 0:
            print(f"  [RFP Analyzer] ⚠️  WARNING: RFP text is empty!", flush=True)
            return {
                "current_step": "rfp_analyzer",
                "errors": ["RFP text is empty"],
                "rfp_summary": None,
                "context_overview": None,
                "business_objectives": [],
                "project_scope": None
            }
        
        log_thought_sync(project_id, None, "rfp_analyzer", f"Analyzing RFP document ({len(rfp_text) if rfp_text else 0} characters)...")
        
        print(f"  [RFP Analyzer] Calling analyze() method...", flush=True)
        # Run analyzer
        result = rfp_analyzer_agent.analyze(
            rfp_text=rfp_text,
            retrieved_context=state.get("retrieved_context"),
            project_id=state["project_id"]
        )
        print(f"  [RFP Analyzer] analyze() returned", flush=True)
        
        print(f"  [RFP Analyzer] Result: {list(result.keys()) if result else 'None'}")
        
        if result.get("error"):
            print(f"  [RFP Analyzer] ❌ Error: {result['error']}")
            updates["errors"] = [f"RFP Analyzer: {result['error']}"]
        else:
            summary_len = len(str(result.get('rfp_summary', ''))) if result.get('rfp_summary') else 0
            print(f"  [RFP Analyzer] ✓ Success - Summary: {summary_len} chars")
            log_thought_sync(project_id, None, "rfp_analyzer", f"RFP analysis complete. Summary: {summary_len} characters, {len(result.get('business_objectives', []))} objectives identified.")
            updates.update({
                "rfp_summary": result.get("rfp_summary"),
                "context_overview": result.get("context_overview"),
                "business_objectives": result.get("business_objectives"),
                "project_scope": result.get("project_scope"),
                "execution_log": [{
                    "step": "rfp_analyzer",
                    "status": "success",
                    "output": "RFP analyzed successfully"
                }]
            })
    except Exception as e:
        print(f"  [RFP Analyzer] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"RFP Analyzer error: {str(e)}"]
        updates["execution_log"] = [{
            "step": "rfp_analyzer",
            "status": "error",
            "error": str(e)
        }]
    
    return updates

def challenge_extractor_node(state: WorkflowState) -> Dict[str, Any]:
    """Challenge Extractor Agent node."""
    # Check if challenges task is enabled
    selected_tasks = state.get("selected_tasks", {})
    if not selected_tasks.get("challenges", True):
        print(f"  [Challenge Extractor] Skipped (not selected)")
        return {"current_step": "challenge_extractor", "challenges": []}
    
    print(f"  [Challenge Extractor] Starting...")
    updates = {"current_step": "challenge_extractor"}
    
    try:
        rfp_summary = state.get("rfp_summary", "")
        business_objectives = state.get("business_objectives", [])
        print(f"  [Challenge Extractor] RFP Summary: {len(rfp_summary) if rfp_summary else 0} chars, Objectives: {len(business_objectives) if business_objectives else 0}")
        
        result = challenge_extractor_agent.extract_challenges(
            rfp_summary=rfp_summary,
            business_objectives=business_objectives
        )
        
        print(f"  [Challenge Extractor] Result: {list(result.keys()) if result else 'None'}")
        
        if result.get("error"):
            print(f"  [Challenge Extractor] ❌ Error: {result['error']}")
            updates["errors"] = [f"Challenge Extractor: {result['error']}"]
        else:
            challenges = result.get("challenges", [])
            print(f"  [Challenge Extractor] ✓ Success - Challenges: {len(challenges) if challenges else 0}")
            updates.update({
                "challenges": challenges,
                "execution_log": [{
                    "step": "challenge_extractor",
                    "status": "success",
                    "challenges_count": len(challenges) if challenges else 0
                }]
            })
    except Exception as e:
        print(f"  [Challenge Extractor] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"Challenge Extractor error: {str(e)}"]
        updates["execution_log"] = [{
            "step": "challenge_extractor",
            "status": "error",
            "error": str(e)
        }]
    
    return updates

def discovery_question_node(state: WorkflowState) -> Dict[str, Any]:
    """Discovery Question Agent node."""
    # Check if questions task is enabled
    selected_tasks = state.get("selected_tasks", {})
    if not selected_tasks.get("questions", True):
        print(f"  [Discovery Question] Skipped (not selected)")
        return {"discovery_questions": {}}
    
    print(f"  [Discovery Question] Starting...")
    updates = {}
    
    try:
        challenges = state.get("challenges", [])
        print(f"  [Discovery Question] Challenges available: {len(challenges) if challenges else 0}")
        
        result = discovery_question_agent.generate_questions(
            challenges=challenges
        )
        
        print(f"  [Discovery Question] Result: {list(result.keys()) if result else 'None'}")
        
        if result.get("error"):
            print(f"  [Discovery Question] ❌ Error: {result['error']}")
            updates["errors"] = [f"Discovery Question: {result['error']}"]
        else:
            questions = result.get("discovery_questions", {})
            questions_count = sum(len(q) for q in questions.values()) if questions else 0
            print(f"  [Discovery Question] ✓ Success - Questions generated: {questions_count}")
            updates.update({
                "discovery_questions": questions,
                "execution_log": [{
                    "step": "discovery_question",
                    "status": "success",
                    "questions_count": questions_count
                }]
            })
    except Exception as e:
        print(f"  [Discovery Question] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"Discovery Question error: {str(e)}"]
        updates["execution_log"] = [{
            "step": "discovery_question",
            "status": "error",
            "error": str(e)
        }]
    
    return updates

def value_proposition_node(state: WorkflowState) -> Dict[str, Any]:
    """Value Proposition Agent node."""
    print(f"  [Value Proposition] Starting...")
    updates = {}
    
    try:
        challenges = state.get("challenges", [])
        rfp_summary = state.get("rfp_summary", "")
        print(f"  [Value Proposition] Challenges: {len(challenges) if challenges else 0}, RFP Summary: {len(rfp_summary) if rfp_summary else 0} chars")
        
        result = value_proposition_agent.generate_value_propositions(
            challenges=challenges,
            rfp_summary=rfp_summary
        )
        
        print(f"  [Value Proposition] Result: {list(result.keys()) if result else 'None'}")
        
        if result.get("error"):
            print(f"  [Value Proposition] ❌ Error: {result['error']}")
            updates["errors"] = [f"Value Proposition: {result['error']}"]
        else:
            value_props = result.get("value_propositions", [])
            print(f"  [Value Proposition] ✓ Success - Value propositions: {len(value_props) if value_props else 0}")
            updates.update({
                "value_propositions": value_props,
                "execution_log": [{
                    "step": "value_proposition",
                    "status": "success",
                    "value_props_count": len(value_props) if value_props else 0
                }]
            })
    except Exception as e:
        print(f"  [Value Proposition] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"Value Proposition error: {str(e)}"]
        updates["execution_log"] = [{
            "step": "value_proposition",
            "status": "error",
            "error": str(e)
        }]
    
    return updates

def case_study_matcher_node(state: WorkflowState) -> Dict[str, Any]:
    """Case Study Matcher Agent node."""
    # Check if cases task is enabled
    selected_tasks = state.get("selected_tasks", {})
    if not selected_tasks.get("cases", True):
        print(f"  [Case Study Matcher] Skipped (not selected)")
        return {"matching_case_studies": []}
    
    print(f"  [Case Study Matcher] Starting...")
    updates = {}
    
    try:
        challenges = state.get("challenges", [])
        print(f"  [Case Study Matcher] Challenges available: {len(challenges) if challenges else 0}")
        
        # Get db from state if available, otherwise create new session
        from db.database import SessionLocal
        db = SessionLocal()
        try:
            result = case_study_matcher_agent.match_case_studies(
                challenges=challenges,
                db=db,
                top_k=3
            )
            
            print(f"  [Case Study Matcher] Result: {list(result.keys()) if result else 'None'}")
            
            if result.get("error"):
                print(f"  [Case Study Matcher] ❌ Error: {result['error']}")
                updates["errors"] = [f"Case Study Matcher: {result['error']}"]
            else:
                case_studies = result.get("matching_case_studies", [])
                print(f"  [Case Study Matcher] ✓ Success - Case studies matched: {len(case_studies) if case_studies else 0}")
                updates.update({
                    "matching_case_studies": case_studies,
                    "execution_log": [{
                        "step": "case_study_matcher",
                        "status": "success",
                        "case_studies_count": len(case_studies) if case_studies else 0
                    }]
                })
        finally:
            db.close()
    except Exception as e:
        print(f"  [Case Study Matcher] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"Case Study Matcher error: {str(e)}"]
        updates["execution_log"] = [{
            "step": "case_study_matcher",
            "status": "error",
            "error": str(e)
        }]
    
    return updates

def proposal_builder_node(state: WorkflowState) -> Dict[str, Any]:
    """Proposal Builder Agent node."""
    # Check if proposal task is enabled
    selected_tasks = state.get("selected_tasks", {})
    if not selected_tasks.get("proposal", True):
        print(f"  [Proposal Builder] Skipped (not selected)")
        return {"current_step": "proposal_builder", "proposal_draft": None}
    
    print(f"  [Proposal Builder] Starting...")
    # This runs sequentially after parallel nodes, so it's safe to update current_step
    updates = {"current_step": "proposal_builder"}
    
    try:
        rfp_summary = state.get("rfp_summary", "")
        challenges = state.get("challenges", [])
        value_propositions = state.get("value_propositions", [])
        case_studies = state.get("matching_case_studies", [])
        
        print(f"  [Proposal Builder] Inputs - Summary: {len(rfp_summary) if rfp_summary else 0} chars, "
              f"Challenges: {len(challenges) if challenges else 0}, "
              f"Value Props: {len(value_propositions) if value_propositions else 0}, "
              f"Case Studies: {len(case_studies) if case_studies else 0}")
        
        # Get full RFP text for long-context injection
        full_rfp_text = state.get("rfp_text")
        
        result = proposal_builder_agent.build_proposal(
            rfp_summary=rfp_summary,
            challenges=challenges,
            value_propositions=value_propositions,
            case_studies=case_studies,
            full_rfp_text=full_rfp_text
        )
        
        print(f"  [Proposal Builder] Result: {list(result.keys()) if result else 'None'}")
        
        if result.get("error"):
            print(f"  [Proposal Builder] ❌ Error: {result['error']}")
            updates["errors"] = [f"Proposal Builder: {result['error']}"]
            # Even on error, try to create a minimal proposal_draft
            updates["proposal_draft"] = {
                "executive_summary": "Executive summary based on RFP requirements",
                "client_challenges": "Client challenges and requirements",
                "proposed_solution": "Proposed solution",
                "benefits_value": "Benefits and value propositions",
                "case_studies": "Case studies",
                "implementation_approach": "Implementation approach"
            }
        else:
            proposal_draft = result.get("proposal_draft")
            if proposal_draft and isinstance(proposal_draft, dict):
                print(f"  [Proposal Builder] ✓ Success - Proposal draft created with {len(proposal_draft)} sections")
                updates.update({
                    "proposal_draft": proposal_draft,
                    "execution_log": [{
                        "step": "proposal_builder",
                        "status": "success",
                        "output": "Proposal draft created"
                    }]
                })
            else:
                print(f"  [Proposal Builder] ⚠ No proposal_draft in result, creating minimal draft")
                # Create a minimal proposal_draft if none was returned (13-section structure)
                updates.update({
                    "proposal_draft": {
                        "executive_summary": "Executive summary based on RFP requirements",
                        "understanding_client_needs": "Understanding of client needs",
                        "proposed_solution": "Proposed solution",
                        "solution_architecture": "Solution architecture and technology stack",
                        "business_value_use_cases": "Business value and use cases",
                        "benefits_roi": "Benefits and ROI justification",
                        "implementation_roadmap": "Implementation roadmap and timeline",
                        "change_management_training": "Change management and training strategy",
                        "security_compliance": "Security, compliance and data governance",
                        "case_studies_credentials": "Case studies and delivery credentials",
                        "commercial_model": "Commercial model and licensing options",
                        "risks_assumptions": "Risks, assumptions and mitigation",
                        "next_steps_cta": "Next steps and call-to-action"
                    },
                    "execution_log": [{
                        "step": "proposal_builder",
                        "status": "success",
                        "output": "Minimal proposal draft created"
                    }]
                })
    except Exception as e:
        print(f"  [Proposal Builder] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"Proposal Builder error: {str(e)}"]
        updates["execution_log"] = [{
            "step": "proposal_builder",
            "status": "error",
            "error": str(e)
        }]
        # Even on exception, create a minimal proposal_draft so the workflow can complete (13-section structure)
        updates["proposal_draft"] = {
            "executive_summary": "Executive summary based on RFP requirements",
            "understanding_client_needs": "Understanding of client needs",
            "proposed_solution": "Proposed solution",
            "solution_architecture": "Solution architecture and technology stack",
            "business_value_use_cases": "Business value and use cases",
            "benefits_roi": "Benefits and ROI justification",
            "implementation_roadmap": "Implementation roadmap and timeline",
            "change_management_training": "Change management and training strategy",
            "security_compliance": "Security, compliance and data governance",
            "case_studies_credentials": "Case studies and delivery credentials",
            "commercial_model": "Commercial model and licensing options",
            "risks_assumptions": "Risks, assumptions and mitigation",
            "next_steps_cta": "Next steps and call-to-action"
        }
    
    return updates

def competitor_analyzer_node(state: WorkflowState) -> Dict[str, Any]:
    """Competitor Analyzer Agent node - Detects competitors and generates battle cards."""
    print(f"  [Competitor Analyzer] Starting...")
    updates = {"current_step": "competitor_analyzer"}
    project_id = state.get("project_id")
    
    try:
        if not settings.ENABLE_BATTLE_CARDS:
            print(f"  [Competitor Analyzer] Skipped (ENABLE_BATTLE_CARDS=False)")
            return updates
        
        rfp_text = state.get("rfp_text", "")
        rfp_summary = state.get("rfp_summary", "")
        
        # Get project industry from database
        industry = None
        try:
            from db.database import get_db
            from models.project import Project
            db = next(get_db())
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                industry = project.industry
            db.close()
        except:
            pass
        
        print(f"  [Competitor Analyzer] Analyzing RFP for competitors...")
        log_thought_sync(project_id, None, "competitor_analyzer", "Scanning RFP for competitor mentions...")
        
        # Analyze RFP
        result = competitor_analyzer_agent.analyze_rfp(
            rfp_text=rfp_text,
            rfp_summary=rfp_summary or rfp_text[:500],
            industry=industry
        )
        
        if result.get("error"):
            print(f"  [Competitor Analyzer] ❌ Error: {result['error']}")
            updates["errors"] = [f"Competitor Analyzer: {result['error']}"]
        else:
            competitors = result.get("competitors", [])
            battle_cards = result.get("battle_cards", [])
            print(f"  [Competitor Analyzer] ✓ Success - Detected {len(competitors)} competitors, generated {len(battle_cards)} battle cards")
            log_thought_sync(
                project_id, None, "competitor_analyzer",
                f"Detected {len(competitors)} competitors: {', '.join(competitors)}",
                {"competitors": competitors, "battle_cards_count": len(battle_cards)}
            )
            
            updates.update({
                "battle_cards": battle_cards,
                "competitors": competitors,
                "execution_log": [{
                    "step": "competitor_analyzer",
                    "status": "success",
                    "output": f"Generated {len(battle_cards)} battle cards for {len(competitors)} competitors"
                }]
            })
            
            # Save to project (via workflow manager will handle this)
        
    except Exception as e:
        print(f"  [Competitor Analyzer] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"Competitor Analyzer error: {str(e)}"]
        updates["execution_log"] = [{
            "step": "competitor_analyzer",
            "status": "error",
            "error": str(e)
        }]
    
    return updates

def outline_generator_node(state: WorkflowState) -> Dict[str, Any]:
    """Outline Generator Agent node - Generates proposal skeleton."""
    print(f"  [Outline Generator] Starting...")
    updates = {"current_step": "outline_generator"}
    
    try:
        rfp_summary = state.get("rfp_summary", "")
        challenges = state.get("challenges", [])
        value_propositions = state.get("value_propositions", [])
        project_id = state.get("project_id")
        
        print(f"  [Outline Generator] Generating outline...")
        
        # Generate outline
        result = outline_generator_agent.generate_outline(
            rfp_summary=rfp_summary,
            challenges=challenges,
            value_propositions=value_propositions
        )
        
        if result.get("error"):
            print(f"  [Outline Generator] ❌ Error: {result['error']}")
            updates["errors"] = [f"Outline Generator: {result['error']}"]
        else:
            outline = result.get("outline", [])
            print(f"  [Outline Generator] ✓ Success - Generated {len(outline)} sections")
            
            updates.update({
                "proposal_outline": outline,
                "execution_log": [{
                    "step": "outline_generator",
                    "status": "success",
                    "output": f"Generated outline with {len(outline)} sections"
                }]
            })
            
            # Stream skeleton via WebSocket (fire and forget)
            if project_id:
                try:
                    # Note: In a real async context, this would be awaited
                    # For now, we'll store it and let the workflow manager handle WebSocket
                    pass  # WebSocket streaming will be handled by workflow manager
                except Exception as e:
                    print(f"  [Outline Generator] ⚠ WebSocket error: {e}")
        
    except Exception as e:
        print(f"  [Outline Generator] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"Outline Generator error: {str(e)}"]
        updates["execution_log"] = [{
            "step": "outline_generator",
            "status": "error",
            "error": str(e)
        }]
    
    return updates

def human_approval_node(state: WorkflowState) -> Dict[str, Any]:
    """Human Approval node - Waits for user approval of outline."""
    print(f"  [Human Approval] Checking approval status...")
    updates = {"current_step": "human_approval"}
    
    try:
        outline_approved = state.get("outline_approved")
        proposal_outline = state.get("proposal_outline")
        
        if not proposal_outline:
            print(f"  [Human Approval] ⚠ No outline to approve")
            updates["errors"] = ["No proposal outline to approve"]
            return updates
        
        # Check if approval is required
        require_approval = settings.REQUIRE_OUTLINE_APPROVAL
        
        if not require_approval:
            # Auto-approve if approval not required
            print(f"  [Human Approval] ✓ Auto-approved (REQUIRE_OUTLINE_APPROVAL=False)")
            updates.update({
                "outline_approved": True,
                "outline_approval_timestamp": str(__import__("datetime").datetime.now()),
                "execution_log": [{
                    "step": "human_approval",
                    "status": "success",
                    "output": "Outline auto-approved"
                }]
            })
            return updates
        
        # Check if already approved
        if outline_approved is True:
            print(f"  [Human Approval] ✓ Already approved")
            updates["execution_log"] = [{
                "step": "human_approval",
                "status": "success",
                "output": "Outline already approved"
            }]
            return updates
        
        # Wait for approval (check database/state)
        # In a real implementation, this would poll the database or wait for a WebSocket message
        # For now, we'll check if approval exists in state (set by API endpoint)
        if outline_approved is False:
            print(f"  [Human Approval] ⏳ Waiting for approval...")
            updates["execution_log"] = [{
                "step": "human_approval",
                "status": "pending",
                "output": "Waiting for user approval"
            }]
            # In a real async implementation, we would yield/await here
            # For now, we'll continue and let the API endpoint set approval
            return updates
        
        # If approval status is None, assume pending
        print(f"  [Human Approval] ⏳ Approval status unknown, assuming pending")
        updates.update({
            "outline_approved": False,  # Set to False to indicate pending
            "execution_log": [{
                "step": "human_approval",
                "status": "pending",
                "output": "Waiting for user approval"
            }]
        })
        
    except Exception as e:
        print(f"  [Human Approval] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates["errors"] = [f"Human Approval error: {str(e)}"]
    
    return updates

def should_continue_after_approval(state: WorkflowState) -> str:
    """Conditional edge: check if outline is approved."""
    outline_approved = state.get("outline_approved")
    require_approval = settings.REQUIRE_OUTLINE_APPROVAL
    
    # If approval not required, always continue
    if not require_approval:
        return "proposal_builder"
    
    # If approved, continue to proposal builder
    if outline_approved is True:
        print(f"  [Workflow] ✓ Outline approved, proceeding to proposal builder")
        return "proposal_builder"
    
    # Otherwise, wait (in real implementation, this would be a blocking wait)
    # For now, we'll skip approval if not set and continue
    print(f"  [Workflow] ⚠ Outline approval pending, proceeding anyway (non-blocking)")
    return "proposal_builder"

def critic_node(state: WorkflowState) -> Dict[str, Any]:
    """Critic Agent node - Reviews proposal and provides quality score."""
    print(f"  [Critic] Starting...")
    updates = {"current_step": "critic"}
    
    try:
        proposal_draft = state.get("proposal_draft")
        rfp_summary = state.get("rfp_summary", "")
        challenges = state.get("challenges", [])
        
        if not proposal_draft:
            print(f"  [Critic] ⚠ No proposal draft to review")
            updates.update({
                "critic_score": 0.5,  # Default low score if no draft
                "refinement_feedback": {
                    "overall_score": 50.0,
                    "weak_sections": ["No proposal draft available"],
                    "suggestions": ["Generate proposal draft first"]
                },
                "execution_log": [{
                    "step": "critic",
                    "status": "warning",
                    "output": "No proposal draft to review"
                }]
            })
            return updates
        
        print(f"  [Critic] Reviewing proposal draft...")
        
        # Review proposal
        review_result = proposal_refiner_agent.review_proposal(
            proposal_draft=proposal_draft,
            rfp_summary=rfp_summary,
            challenges=challenges
        )
        
        overall_score = review_result.get("overall_score", 70.0)
        # Normalize score to 0-1 range (divide by 100)
        critic_score = overall_score / 100.0
        
        print(f"  [Critic] Score: {overall_score}/100 ({critic_score:.2f})")
        
        # Log thought
        project_id = state.get("project_id")
        log_thought_sync(
            project_id, None, "critic",
            f"Proposal review complete. Score: {overall_score}/100",
            {"score": overall_score, "threshold": 90, "weak_sections": review_result.get("weak_sections", [])}
        )
        
        # Get current history
        history = state.get("critic_scores_history", [])
        if history is None:
            history = []
        
        # Add to history
        history.append({
            "iteration": state.get("refinement_iterations", 0),
            "score": overall_score,
            "critic_score": critic_score,
            "timestamp": str(__import__("datetime").datetime.now()),
            "weak_sections": review_result.get("weak_sections", []),
            "suggestions": review_result.get("suggestions", [])
        })
        
        updates.update({
            "critic_score": critic_score,
            "refinement_feedback": review_result,
            "critic_scores_history": history,
            "execution_log": [{
                "step": "critic",
                "status": "success",
                "output": f"Proposal reviewed: {overall_score}/100",
                "score": overall_score
            }]
        })
        
        print(f"  [Critic] ✓ Review complete - Score: {overall_score}/100")
        
    except Exception as e:
        print(f"  [Critic] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        updates.update({
            "critic_score": 0.5,  # Default score on error
            "errors": [f"Critic error: {str(e)}"],
            "execution_log": [{
                "step": "critic",
                "status": "error",
                "error": str(e)
            }]
        })
    
    return updates

def refine_node(state: WorkflowState) -> Dict[str, Any]:
    """Refine Agent node - Refines proposal based on critic feedback."""
    print(f"  [Refine] Starting...")
    updates = {"current_step": "refine"}
    
    try:
        proposal_draft = state.get("proposal_draft")
        refinement_feedback = state.get("refinement_feedback", {})
        rfp_summary = state.get("rfp_summary", "")
        refinement_iterations = state.get("refinement_iterations", 0)
        
        # Check max iterations
        max_iterations = settings.MAX_REFINEMENT_ITERATIONS
        if refinement_iterations >= max_iterations:
            print(f"  [Refine] ⚠ Max iterations ({max_iterations}) reached, skipping refinement")
            updates.update({
                "execution_log": [{
                    "step": "refine",
                    "status": "skipped",
                    "output": f"Max iterations ({max_iterations}) reached"
                }]
            })
            return updates
        
        if not proposal_draft:
            print(f"  [Refine] ⚠ No proposal draft to refine - stopping workflow")
            updates.update({
                "refinement_iterations": refinement_iterations + 1,  # Increment to stop loop
                "execution_log": [{
                    "step": "refine",
                    "status": "error",
                    "output": "No proposal draft to refine - workflow stopped"
                }],
                "errors": ["Cannot refine proposal: No proposal draft available"]
            })
            return updates
        
        print(f"  [Refine] Refining proposal (iteration {refinement_iterations + 1}/{max_iterations})...")
        
        # Ensure refinement_feedback is a dict
        if not isinstance(refinement_feedback, dict):
            refinement_feedback = {}
        
        # Refine proposal
        refined_draft = proposal_refiner_agent.refine_proposal(
            proposal_draft=proposal_draft,
            review_results=refinement_feedback,
            rfp_summary=rfp_summary,
            max_iterations=1  # Single iteration per refine node call
        )
        
        if not refined_draft:
            print(f"  [Refine] ⚠ Refinement returned None, keeping original draft")
            refined_draft = proposal_draft  # Keep original if refinement fails
        
        updates.update({
            "proposal_draft": refined_draft,
            "refinement_iterations": refinement_iterations + 1,
            "execution_log": [{
                "step": "refine",
                "status": "success",
                "output": f"Proposal refined (iteration {refinement_iterations + 1})"
            }]
        })
        
        print(f"  [Refine] ✓ Refinement complete")
        
    except Exception as e:
        print(f"  [Refine] ❌ Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # If refinement fails, increment iterations to prevent infinite loop
        current_iterations = state.get("refinement_iterations", 0)
        proposal_draft = state.get("proposal_draft")
        
        updates.update({
            "refinement_iterations": current_iterations + 1,
            "errors": [f"Refine error: {str(e)}"],
            "execution_log": [{
                "step": "refine",
                "status": "error",
                "error": str(e)
            }]
        })
        
        # If no proposal_draft, stop the loop
        if not proposal_draft:
            print(f"  [Refine] ⚠ No proposal draft available, stopping workflow")
    
    return updates

def should_continue_refinement(state: WorkflowState) -> str:
    """Conditional edge: check if refinement should continue."""
    critic_score = state.get("critic_score")
    refinement_iterations = state.get("refinement_iterations", 0)
    max_iterations = settings.MAX_REFINEMENT_ITERATIONS
    proposal_draft = state.get("proposal_draft")
    
    # If no proposal draft, stop (can't refine nothing)
    if not proposal_draft:
        print(f"  [Workflow] ⚠ No proposal draft available, ending workflow")
        return "end"
    
    # If score is >= 0.9, we're done
    if critic_score is not None and critic_score >= 0.9:
        print(f"  [Workflow] ✓ Quality threshold met (score: {critic_score:.2f}), ending workflow")
        return "end"
    
    # If we've hit max iterations, stop
    if refinement_iterations >= max_iterations:
        print(f"  [Workflow] ⚠ Max iterations ({max_iterations}) reached, ending workflow")
        return "end"
    
    # Otherwise, refine again
    score_display = f"{critic_score:.2f}" if critic_score is not None else "N/A"
    print(f"  [Workflow] Quality score {score_display} below threshold (0.9), refining...")
    return "refine"

def should_run_challenges(state: WorkflowState) -> str:
    """Conditional edge: check if challenges should run."""
    selected_tasks = state.get("selected_tasks", {})
    if selected_tasks.get("challenges", True):
        return "challenge_extractor"
    return "proposal_builder"  # Skip to proposal if challenges not selected

def create_workflow_graph() -> StateGraph:
    """Create the LangGraph workflow."""
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("rfp_analyzer", rfp_analyzer_node)
    workflow.add_node("challenge_extractor", challenge_extractor_node)
    workflow.add_node("discovery_question", discovery_question_node)
    workflow.add_node("value_proposition", value_proposition_node)
    workflow.add_node("case_study_matcher", case_study_matcher_node)
    workflow.add_node("competitor_analyzer", competitor_analyzer_node)
    workflow.add_node("outline_generator", outline_generator_node)
    workflow.add_node("human_approval", human_approval_node)
    workflow.add_node("proposal_builder", proposal_builder_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("refine", refine_node)
    
    # Define edges (workflow order)
    workflow.set_entry_point("rfp_analyzer")
    # RFP analyzer always runs, then conditionally go to challenge extractor or proposal builder
    workflow.add_conditional_edges(
        "rfp_analyzer",
        should_run_challenges,
        {
            "challenge_extractor": "challenge_extractor",
            "proposal_builder": "proposal_builder"
        }
    )
    # After challenge extractor, run parallel tasks (they check internally if enabled)
    workflow.add_edge("challenge_extractor", "discovery_question")
    workflow.add_edge("challenge_extractor", "value_proposition")
    workflow.add_edge("challenge_extractor", "case_study_matcher")
    workflow.add_edge("challenge_extractor", "competitor_analyzer")
    # All parallel tasks converge to outline generator
    workflow.add_edge("discovery_question", "outline_generator")
    workflow.add_edge("value_proposition", "outline_generator")
    workflow.add_edge("case_study_matcher", "outline_generator")
    workflow.add_edge("competitor_analyzer", "outline_generator")
    
    # After outline generator, go to human approval
    workflow.add_edge("outline_generator", "human_approval")
    
    # After approval, conditionally go to proposal builder
    workflow.add_conditional_edges(
        "human_approval",
        should_continue_after_approval,
        {
            "proposal_builder": "proposal_builder"
        }
    )
    
    # After proposal builder, go to critic
    workflow.add_edge("proposal_builder", "critic")
    
    # Critic decides: if score >= 0.9, end; otherwise refine
    workflow.add_conditional_edges(
        "critic",
        should_continue_refinement,
        {
            "end": END,
            "refine": "refine"
        }
    )
    
    # After refine, go back to critic (cyclic loop)
    workflow.add_edge("refine", "critic")
    
    return workflow.compile()

# Global workflow instance
workflow_graph = create_workflow_graph()

