@echo off
REM ===============================================
REM Production-Ready Python Environment Setup
REM for WhisperX + PyTorch 2.5.1
REM ===============================================

echo.
echo [1/5] Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found! Please install Python 3.10+ from python.org
    exit /b 1
)

echo.
echo [2/5] Creating virtual environment...
if exist venv (
    echo Virtual environment already exists. Removing old one...
    rmdir /s /q venv
)
python -m venv venv

echo.
echo [3/5] Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo [4/5] Upgrading pip...
python -m pip install --upgrade pip

echo.
echo [5/5] Installing PyTorch 2.5.1 + WhisperX...
pip install torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cpu
pip install git+https://github.com/m-bain/whisperx.git
pip install numpy<2.0.0 omegaconf

echo.
echo ===============================================
echo SUCCESS! Python environment is ready.
echo ===============================================
echo.
echo Virtual environment location: %cd%\venv
echo Python executable: %cd%\venv\Scripts\python.exe
echo.
echo To verify installation:
echo   venv\Scripts\python -c "import torch; print('PyTorch:', torch.__version__)"
echo   venv\Scripts\python -c "import whisperx; print('WhisperX: OK')"
echo.
echo To activate manually: venv\Scripts\activate.bat
echo ===============================================
