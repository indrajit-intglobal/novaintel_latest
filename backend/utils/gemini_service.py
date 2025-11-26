"""
Gemini LLM Service - Direct API integration with Google Gemini.
"""
from typing import Optional, Dict, Any, List, Union
import json
import re
import requests
import base64
from pathlib import Path
from utils.config import settings
from utils.retry import retry, async_retry
from utils.circuit_breaker import circuit_breaker, async_circuit_breaker

class GeminiService:
    """Service for interacting with Google Gemini API directly with retry and circuit breaker."""
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
    def is_available(self) -> bool:
        """Check if Gemini service is available."""
        return bool(self.api_key)
    
    @retry(max_attempts=3, backoff="exponential", base_delay=1.0, exceptions=(requests.RequestException,))
    @circuit_breaker(failure_threshold=5, recovery_timeout=60.0, expected_exception=Exception)
    def _make_request(self, url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP request with retry and circuit breaker."""
        headers = {
            "Content-Type": "application/json"
        }
        
        if self.api_key:
            url = f"{url}?key={self.api_key}"
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        # Better error handling for 400 errors
        if response.status_code == 400:
            try:
                error_data = response.json()
                error_obj = error_data.get("error", {})
                error_message = error_obj.get("message", "Bad Request")
                error_code = error_obj.get("code", 400)
                
                # Check for API key issues
                error_details = error_obj.get("details", [])
                is_api_key_error = any(
                    detail.get("reason") == "API_KEY_INVALID" or 
                    "API key" in error_message or
                    "API_KEY" in str(detail)
                    for detail in error_details
                )
                
                if is_api_key_error:
                    raise requests.RequestException(
                        f"400 Bad Request: {error_message}. "
                        f"Please check your GEMINI_API_KEY in the .env file and ensure it's valid and not expired."
                    )
                
                # Check for model-related errors
                is_model_error = (
                    "model" in error_message.lower() or
                    "invalid" in error_message.lower() and "model" in str(error_data).lower()
                )
                
                if is_model_error:
                    raise requests.RequestException(
                        f"400 Bad Request: {error_message}. "
                        f"Model '{self.model}' may not be available. "
                        f"Try 'gemini-1.5-flash' or 'gemini-1.5-pro' instead."
                    )
                
                # Generic 400 error
                print(f"[Gemini API] 400 Error Details: {error_obj}")
                raise requests.RequestException(
                    f"400 Bad Request: {error_message}. "
                    f"Full error: {error_data}"
                )
            except (ValueError, KeyError, json.JSONDecodeError):
                error_text = response.text[:500] if response.text else "No error details"
                raise requests.RequestException(
                    f"400 Bad Request: Invalid request format. "
                    f"Response: {error_text}"
                )
        
        response.raise_for_status()
        return response.json()
    
    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate content using Gemini API.
        
        Args:
            prompt: User prompt
            system_instruction: System instruction (optional)
            temperature: Temperature for generation
            max_tokens: Maximum tokens (optional)
        
        Returns:
            dict with 'content', 'error' keys
        """
        if not self.is_available():
            return {
                "content": None,
                "error": "Gemini API key not configured"
            }
        
        url = f"{self.base_url}/models/{self.model}:generateContent"
        
        # Build request payload
        contents = [{"parts": [{"text": prompt}]}]
        
        generation_config = {
            "temperature": temperature,
        }
        if max_tokens:
            generation_config["maxOutputTokens"] = max_tokens
        
        payload = {
            "contents": contents,
            "generationConfig": generation_config
        }
        
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        
        try:
            response_data = self._make_request(url, payload)
            
            if "candidates" in response_data and len(response_data["candidates"]) > 0:
                candidate = response_data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    content = candidate["content"]["parts"][0].get("text", "")
                    return {
                        "content": content,
                        "error": None
                    }
            
            return {
                "content": None,
                "error": "No response from Gemini API"
            }
        except requests.RequestException as e:
            return {
                "content": None,
                "error": f"Request failed: {str(e)}"
            }
        except Exception as e:
            return {
                "content": None,
                "error": f"Unexpected error: {str(e)}"
            }
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Chat with Gemini using message history.
        
        Args:
            messages: List of messages with 'role' and 'content'
            temperature: Temperature for generation
        
        Returns:
            dict with 'content', 'error' keys
        """
        if not self.is_available():
            return {
                "content": None,
                "error": "Gemini API key not configured"
            }
        
        url = f"{self.base_url}/models/{self.model}:generateContent"
        
        # Convert messages to Gemini format
        contents = []
        system_instruction = None
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                system_instruction = content
            elif role == "user":
                contents.append({
                    "parts": [{"text": content}],
                    "role": "user"
                })
            elif role == "assistant":
                contents.append({
                    "parts": [{"text": content}],
                    "role": "model"
                })
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature
            }
        }
        
        # Add system instruction if provided
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }
        
        # Ensure we have at least one content
        if not contents:
            contents.append({
                "parts": [{"text": ""}],
                "role": "user"
            })
            payload["contents"] = contents
        
        print(f"    [GeminiService.chat] Making API request to {url}...", flush=True)
        import sys
        sys.stdout.flush()
        
        try:
            response_data = self._make_request(url, payload)
            print(f"    [GeminiService.chat] API request completed", flush=True)
            
            if "candidates" in response_data and len(response_data["candidates"]) > 0:
                candidate = response_data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    content = candidate["content"]["parts"][0].get("text", "")
                    return {
                        "content": content,
                        "error": None
                    }
            
            return {
                "content": None,
                "error": "No content in response"
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "content": None,
                "error": f"API request failed: {str(e)}"
            }
        except Exception as e:
            return {
                "content": None,
                "error": f"Error: {str(e)}"
            }
    
    def extract_json(self, text: str) -> Optional[Dict]:
        """Extract JSON from text response."""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        return None
    
    def generate_content_with_images(
        self,
        prompt: str,
        images: List[Union[str, bytes, Path]],
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        response_mime_type: Optional[str] = "application/json"
    ) -> Dict[str, Any]:
        """
        Generate content using Gemini API with image inputs (multimodal).
        
        Args:
            prompt: User prompt
            images: List of image paths (str/Path) or image bytes
            system_instruction: System instruction (optional)
            temperature: Temperature for generation
            max_tokens: Maximum tokens (optional)
            response_mime_type: MIME type for response (e.g., "application/json")
        
        Returns:
            dict with 'content', 'error' keys
        """
        if not self.is_available():
            return {
                "content": None,
                "error": "Gemini API key not configured"
            }
        
        url = f"{self.base_url}/models/{self.model}:generateContent"
        
        # Build parts with text and images
        parts = [{"text": prompt}]
        
        # Add images
        for image in images:
            image_data = None
            mime_type = "image/png"  # default
            
            # Handle different image input types
            if isinstance(image, (str, Path)):
                image_path = Path(image)
                if not image_path.exists():
                    continue
                
                # Determine MIME type from extension
                ext = image_path.suffix.lower()
                mime_type_map = {
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".gif": "image/gif",
                    ".webp": "image/webp"
                }
                mime_type = mime_type_map.get(ext, "image/png")
                
                # Read image file
                with open(image_path, "rb") as f:
                    image_data = base64.b64encode(f.read()).decode("utf-8")
            elif isinstance(image, bytes):
                image_data = base64.b64encode(image).decode("utf-8")
            else:
                continue
            
            if image_data:
                parts.append({
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": image_data
                    }
                })
        
        contents = [{"parts": parts}]
        
        generation_config = {
            "temperature": temperature,
        }
        if max_tokens:
            generation_config["maxOutputTokens"] = max_tokens
        if response_mime_type:
            generation_config["response_mime_type"] = response_mime_type
        
        payload = {
            "contents": contents,
            "generationConfig": generation_config
        }
        
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        
        try:
            response_data = self._make_request(url, payload)
            
            if "candidates" in response_data and len(response_data["candidates"]) > 0:
                candidate = response_data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    # Handle JSON response
                    if response_mime_type == "application/json":
                        content = candidate["content"]["parts"][0].get("text", "")
                        try:
                            # Try to parse as JSON
                            json_content = json.loads(content)
                            return {
                                "content": json_content,
                                "error": None
                            }
                        except json.JSONDecodeError:
                            # Return raw text if JSON parsing fails
                            return {
                                "content": content,
                                "error": None
                            }
                    else:
                        content = candidate["content"]["parts"][0].get("text", "")
                        return {
                            "content": content,
                            "error": None
                        }
            
            return {
                "content": None,
                "error": "No response from Gemini API"
            }
        except requests.RequestException as e:
            return {
                "content": None,
                "error": f"Request failed: {str(e)}"
            }
        except Exception as e:
            return {
                "content": None,
                "error": f"Unexpected error: {str(e)}"
            }

# Global instance
gemini_service = GeminiService()

