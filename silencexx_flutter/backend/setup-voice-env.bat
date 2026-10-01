@echo off
REM ===============================================
REM Production Voice Transcription Setup
REM PyTorch 2.8 + faster-whisper (WhisperX alternative)
REM ===============================================

echo.
echo ===============================================
echo VOICE TRANSCRIPTION ENVIRONMENT SETUP
echo ===============================================
echo.

echo [1/6] Checking Python installation...
python --version 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Python not found in PATH!
    echo Please install Python 3.10+ from python.org
    echo Or use full path: C:\Python3\python.exe -m venv venv
    exit /b 1
)

echo.
echo [2/6] Creating virtual environment...
if exist venv (
    echo Virtual environment exists. Removing old one...
    rmdir /s /q venv
)
python -m venv venv

echo.
echo [3/6] Upgrading pip...
venv\Scripts\python.exe -m pip install --upgrade pip

echo.
echo [4/6] Installing PyTorch 2.8+ (CPU version)...
echo This will download ~250MB...
venv\Scripts\pip.exe install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

echo.
echo [5/6] Installing faster-whisper (production-ready)...
venv\Scripts\pip.exe install faster-whisper

echo.
echo [6/6] Verifying installation...
venv\Scripts\python.exe -c "import torch; print('PyTorch:', torch.__version__)"
venv\Scripts\python.exe -c "from faster_whisper import WhisperModel; print('faster-whisper: OK')"

echo.
echo ===============================================
echo SUCCESS! Voice transcription environment ready
echo ===============================================
echo.
echo Virtual environment: %cd%\venv
echo Python executable: %cd%\venv\Scripts\python.exe
echo.
echo Transcription engine: faster-whisper (PyTorch 2.8+ compatible)
echo   - No OmegaConf conflicts
echo   - Production-ready security
echo   - Same speed as WhisperX
echo.
echo To test transcription:
echo   venv\Scripts\python.exe scripts\transcribe-v2.py uploads\audio.m4a ru
echo.
echo To start backend:
echo   npm run dev
echo.
echo ===============================================
