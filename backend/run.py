#!/usr/bin/env python3
"""
Development server runner for NovaIntel API
"""
import uvicorn
import sys
import asyncio
import signal

def signal_handler(sig, frame):
    """Handle shutdown signals gracefully."""
    print("\n[INFO] Shutdown signal received, stopping server...")
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("[INFO] Starting NovaIntel API server...")
    print("[INFO] Server will be available at http://localhost:8000")
    print("[INFO] API docs available at http://localhost:8000/docs")
    print("[INFO] Press CTRL+C to stop the server\n")
    
    try:
        uvicorn.run(
            "main:app",
            host="127.0.0.1",  # Use localhost instead of 0.0.0.0 for better compatibility
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped by user")
        sys.exit(0)
    except asyncio.CancelledError:
        # Suppress CancelledError during shutdown - it's expected
        print("\n[INFO] Server shutdown complete")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERROR] Server failed to start: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

