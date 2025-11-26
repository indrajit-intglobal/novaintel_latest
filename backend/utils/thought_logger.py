"""
Thought logger utility for streaming agent reasoning via WebSocket.
"""
from typing import Optional, Dict, Any
from utils.websocket_manager import global_ws_manager
import asyncio

async def log_thought(
    project_id: int,
    user_id: Optional[int],
    step: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log and broadcast agent thought via WebSocket.
    
    Args:
        project_id: Project ID
        user_id: User ID (optional, uses project_id if not provided)
        step: Workflow step name (e.g., "rfp_analyzer", "critic")
        message: Thought message
        metadata: Optional metadata (scores, decisions, etc.)
    """
    try:
        target_user_id = user_id or project_id  # Fallback to project_id
        
        thought_message = {
            "type": "thought",
            "project_id": project_id,
            "step": step,
            "message": message,
            "timestamp": str(__import__("datetime").datetime.now()),
            "metadata": metadata or {}
        }
        
        await global_ws_manager.send_to_user(target_user_id, thought_message)
    except Exception as e:
        # Silently fail - thoughts are non-critical
        print(f"[Thought Logger] Error: {e}")

def log_thought_sync(
    project_id: int,
    user_id: Optional[int],
    step: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Synchronous version of log_thought (for non-async contexts).
    """
    try:
        loop = None
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            # No event loop exists
            pass
        
        if loop and loop.is_running():
            # Event loop is running, schedule the coroutine
            try:
                asyncio.create_task(
                    log_thought(project_id, user_id, step, message, metadata)
                )
            except Exception:
                # If create_task fails, just skip (non-critical)
                pass
        elif loop:
            # Event loop exists but not running
            loop.run_until_complete(
                log_thought(project_id, user_id, step, message, metadata)
            )
        else:
            # No event loop, create new one
            asyncio.run(log_thought(project_id, user_id, step, message, metadata))
    except Exception as e:
        # Silently fail - thoughts are non-critical
        print(f"[Thought Logger] Error: {e}")

