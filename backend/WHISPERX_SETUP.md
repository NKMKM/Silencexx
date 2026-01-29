# WhisperX Installation & Setup Guide

## Quick Start

WhisperX is a faster and more accurate alternative to Whisper with better multilingual support.

### 1. Install Python Dependencies

```bash
# Core WhisperX
pip install whisperx

# Alternative (if above doesn't work):
pip install openai-whisper faster-whisper stable-ts

# For GPU acceleration (NVIDIA CUDA):
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install whisperx

# For GPU acceleration (AMD ROCm):
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm5.7
```

### 2. Verify Installation

```bash
python -c "import whisperx; print('WhisperX installed successfully')"
```

### 3. Supported Languages

WhisperX supports 99+ languages. Common language codes:
- `ru` - Русский
- `en` - English  
- `es` - Español
- `fr` - Français
- `de` - Deutsch
- `zh` - 中文

### 4. Performance Tips

**CPU (Default)**
- Model size: `base` or `small` recommended (balance of speed/accuracy)
- Compute type: `int8` (saves memory)
- Speed: ~2-5 minutes for 1-minute audio

**GPU (NVIDIA CUDA)**
- Model size: `medium` or `large` possible
- Compute type: `float16` or `float32`
- Speed: ~10-20 seconds for 1-minute audio

**Memory Requirements**
- CPU + `base`: ~1-2 GB
- CPU + `small`: ~2-3 GB  
- GPU + `base`: ~2-3 GB VRAM
- GPU + `medium`: ~5-7 GB VRAM

### 5. Mock Mode (Development)

To test without installing WhisperX:

```bash
export MOCK_WHISPER=true
# or in Windows:
set MOCK_WHISPER=true
```

### 6. Supported Audio Formats

- MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM, OGG, FLAC, M4B

### 7. Troubleshooting

**"Model not found" error**
```bash
# Download models manually
whisperx --model_dir ./models
```

**CUDA not detected**
```bash
python -c "import torch; print(torch.cuda.is_available())"
# Should return True if CUDA is properly installed
```

**Memory issues**
- Reduce model size: use `tiny` (fastest) instead of `base`
- Use CPU mode with `int8` compute type
- Increase page file size on Windows

### 8. Backend Integration

The transcribe.py script automatically:
- Detects available CUDA GPU
- Falls back to CPU if GPU unavailable
- Uses optimal compute type based on device
- Aligns word-level timestamps
- Supports language detection/specification
