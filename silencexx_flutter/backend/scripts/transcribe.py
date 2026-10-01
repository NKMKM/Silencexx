import sys
import json
import warnings
import os
import logging
from pathlib import Path

# Suppress ALL warnings and logs before any imports
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

# Disable all logging to stdout
logging.disable(logging.CRITICAL)
for logger_name in ['whisperx', 'whisperx.asr', 'whisperx.vads', 'whisperx.vads.pyannote', 
                    'faster_whisper', 'pyannote', 'pytorch', 'transformers']:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.CRITICAL)
    logger.disabled = True
    logger.propagate = False

def transcribe_audio(file_path: str, language: str = 'ru') -> dict:
    """
    Transcribe audio using WhisperX with better accuracy and speed.
    WhisperX uses faster-whisper backend and provides word-level timestamps.
    
    IMPORTANT: Requires PyTorch 2.5.1 (NOT 2.6+) due to weights_only breaking change.
    See WHISPERX_SETUP.md for installation instructions.
    """
    
    # Check if we should use Mock for development
    if os.environ.get('MOCK_WHISPER') == 'true':
        return {"text": "Это тестовая расшифровка голосового сообщения. (Mock WhisperX)", "language": language}
    
    try:
        # Suppress warnings during imports
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            
            import torch
            import whisperx
        
        # Log versions for debugging
        print(f"PyTorch version: {torch.__version__}", file=sys.stderr)
        
        # Detect available device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        
        # Load model (much faster than standard whisper)
        model = whisperx.load_model("base", device=device, compute_type=compute_type)
        
        # Transcribe audio with specified language
        audio = whisperx.load_audio(file_path)
        result = model.transcribe(audio, language=language)
        
        # Extract text from segments
        full_text = " ".join([segment["text"].strip() for segment in result.get("segments", [])])
        
        return {
            "text": full_text or "Не удалось расшифровать аудио",
            "language": result.get("language", language)
        }
        
    except ImportError as e:
        return {"error": f"Module not found: {str(e)}"}
    except Exception as e:
        return {"error": f"Transcription error: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file provided"}))
        sys.exit(1)
    
    audio_file = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else 'ru'
    
    result = transcribe_audio(audio_file, language)
    # Output ONLY the JSON, nothing else
    print(json.dumps(result, ensure_ascii=False))
