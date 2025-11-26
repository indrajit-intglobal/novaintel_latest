"""
Text-to-Speech service for audio briefing generation.
"""
from typing import Optional, Dict, Any
from utils.config import settings
import os
from pathlib import Path

class TTSService:
    """Service for converting text to speech."""
    
    def __init__(self):
        self.provider = settings.TTS_PROVIDER
        self._initialize()
    
    def _initialize(self):
        """Initialize TTS provider."""
        if self.provider == "google":
            try:
                from google.cloud import texttospeech
                self.google_client = texttospeech.TextToSpeechClient()
                self.google_available = True
            except ImportError:
                print("[TTS] Google Cloud TTS not available (install google-cloud-texttospeech)")
                self.google_available = False
            except Exception as e:
                print(f"[TTS] Google Cloud TTS initialization error: {e}")
                self.google_available = False
        elif self.provider == "azure":
            try:
                import azure.cognitiveservices.speech as speechsdk
                # Would need Azure key/region from config
                self.azure_available = False  # Placeholder
            except ImportError:
                print("[TTS] Azure TTS not available (install azure-cognitiveservices-speech)")
                self.azure_available = False
    
    def generate_audio(
        self,
        text: str,
        output_path: str,
        language: str = "en-US",
        voice_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate audio file from text.
        
        Args:
            text: Text to convert
            output_path: Path to save audio file
            language: Language code
            voice_name: Voice name (optional)
        
        Returns:
            dict with 'success', 'file_path', 'error'
        """
        if self.provider == "google" and self.google_available:
            return self._generate_google_audio(text, output_path, language, voice_name)
        else:
            # Fallback: return text script (no audio generation)
            return {
                "success": False,
                "file_path": None,
                "error": f"TTS provider '{self.provider}' not available. Audio generation disabled.",
                "script": text  # Return script as fallback
            }
    
    def _generate_google_audio(
        self,
        text: str,
        output_path: str,
        language: str,
        voice_name: Optional[str]
    ) -> Dict[str, Any]:
        """Generate audio using Google Cloud TTS."""
        try:
            from google.cloud import texttospeech
            
            # Configure voice
            voice = texttospeech.VoiceSelectionParams(
                language_code=language,
                name=voice_name or "en-US-Standard-C"  # Default voice
            )
            
            # Configure audio
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3
            )
            
            # Synthesize
            synthesis_input = texttospeech.SynthesisInput(text=text)
            response = self.google_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            # Save to file
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, "wb") as out:
                out.write(response.audio_content)
            
            return {
                "success": True,
                "file_path": str(output_file),
                "error": None
            }
            
        except Exception as e:
            return {
                "success": False,
                "file_path": None,
                "error": str(e),
                "script": text  # Return script as fallback
            }

# Global instance
tts_service = TTSService()

