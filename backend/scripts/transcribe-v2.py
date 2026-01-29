"""
PRODUCTION-READY Voice Transcription
Using faster-whisper directly (bypass WhisperX OmegaConf issue)

Advantages:
- ✅ Compatible with PyTorch 2.8+
- ✅ No OmegaConf conflicts
- ✅ Faster than standard Whisper
- ✅ No security compromises
- ✅ Same quality as WhisperX
"""
import sys
import json
import warnings
import os
from pathlib import Path

# Suppress warnings
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"

def transcribe_audio(file_path: str, language: str = 'ru') -> dict:
    """
    Transcribe audio using faster-whisper (WhisperX backend).
    
    This avoids WhisperX's OmegaConf dependency which is incompatible
    with PyTorch 2.6+ security restrictions.
    """
    
    # Mock mode for testing
    if os.environ.get('MOCK_WHISPER') == 'true':
        return {
            "text": "Это тестовая расшифровка голосового сообщения.",
            "language": language
        }
    
    try:
        from faster_whisper import WhisperModel
        
        # Initialize model
        # compute_type: "int8" for CPU, "float16" for GPU
        model = WhisperModel(
            "base",
            device="cpu",
            compute_type="int8",
            download_root=None  # Use default cache
        )
        
        # Transcribe
        segments, info = model.transcribe(
            file_path,
            language=language,
            beam_size=5,
            vad_filter=True,  # Voice activity detection
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        # Extract text from segments
        text_parts = []
        for segment in segments:
            text_parts.append(segment.text.strip())
        
        full_text = " ".join(text_parts)
        
        return {
            "text": full_text or "Не удалось расшифровать аудио",
            "language": info.language,
            "duration": info.duration
        }
        
    except ImportError as e:
        return {"error": f"Module not found: {str(e)}. Install: pip install faster-whisper"}
    except Exception as e:
        return {"error": f"Transcription error: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file provided"}))
        sys.exit(1)
    
    audio_file = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else 'ru'
    
    # Check file exists
    if not os.path.exists(audio_file):
        print(json.dumps({"error": f"File not found: {audio_file}"}))
        sys.exit(1)
    
    result = transcribe_audio(audio_file, language)
    
    # Output ONLY JSON
    print(json.dumps(result, ensure_ascii=False))
