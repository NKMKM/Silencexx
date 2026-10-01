import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

// Python environment detection
function getPythonExecutable(): string {
  if (process.env.PYTHON_EXECUTABLE) return process.env.PYTHON_EXECUTABLE;
  // Priority 1: Virtual environment (production-ready)
  // When running with ts-node, __dirname is backend/src
  // When running compiled, __dirname is backend/dist
  const venvPath = path.join(__dirname, process.platform === 'win32' ? '../venv/Scripts/python.exe' : '../venv/bin/python');
  
  console.log(`🔍 [PYTHON] Checking venv at: ${venvPath}`);
  
  if (fs.existsSync(venvPath)) {
    const absolutePath = path.resolve(venvPath);
    console.log('✅ [PYTHON] Using Python from virtual environment:', absolutePath);
    return absolutePath;
  }
  
  // Priority 2: User-installed Python 3.13 (fallback for Windows)
  if (process.platform === 'win32') {
    const python313 = 'C:\\Users\\artem\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
    if (fs.existsSync(python313)) {
      console.warn('⚠️ [PYTHON] Using system Python (no venv found):', python313);
      console.warn('⚠️ [PYTHON] Run: python -m venv venv && venv\\Scripts\\pip install faster-whisper');
      return python313;
    }
  }
  
  // Priority 3: System Python (Linux/Mac or fallback)
  console.warn('⚠️ [PYTHON] Using system Python command. May not have torch installed!');
  return 'python3';
}

export const config = {
  // Ollama configuration
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'neural-chat', // или 'neural-chat', 'openchat' и т.д.
  
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Proxy configuration (if needed)
  httpProxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || '',
  
  // Python configuration for WhisperX
  pythonExecutable: getPythonExecutable(),
  transcriptionTimeout: 120000, // 2 minutes
  mockWhisper: process.env.MOCK_WHISPER === 'true', // For testing without Python
};

// Validate Ollama configuration
if (!config.ollamaUrl || !config.ollamaModel) {
  console.warn('⚠️ Ollama configuration incomplete:');
  console.warn('   OLLAMA_URL:', config.ollamaUrl);
  console.warn('   OLLAMA_MODEL:', config.ollamaModel);
}
