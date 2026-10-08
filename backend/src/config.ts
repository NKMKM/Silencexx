import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

// Python environment detection
function getPythonExecutable(): string {
  // Priority 1: Virtual environment (production-ready)
  // When running with ts-node, __dirname is backend/src
  // When running compiled, __dirname is backend/dist
  const venvPath = path.join(__dirname, '../venv/Scripts/python.exe');
  
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
  // Qwen API key stays on the backend. Region must match the key.
  qwenApiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || '',
  qwenBaseUrl: (process.env.QWEN_BASE_URL || (process.env.QWEN_WORKSPACE_ID
    ? `https://${process.env.QWEN_WORKSPACE_ID}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`
    : 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1')).replace(/\/+$/, ''),
  qwenModel: process.env.QWEN_MODEL || 'qwen-flash',
  qwenTimeoutMs: Number(process.env.QWEN_TIMEOUT_MS || 45000),
  qwenMaxOutputTokens: Number(process.env.QWEN_MAX_OUTPUT_TOKENS || 512),
  qwenMaxInputChars: Number(process.env.QWEN_MAX_INPUT_CHARS || 24000),
  // USD per million tokens: Singapore International qwen-flash, <=256K input.
  // Override all three rates when changing model or region.
  qwenInputPrice: Number(process.env.QWEN_INPUT_USD_PER_MILLION || 0.05),
  qwenCachedInputPrice: Number(process.env.QWEN_CACHED_INPUT_USD_PER_MILLION || 0.01),
  qwenOutputPrice: Number(process.env.QWEN_OUTPUT_USD_PER_MILLION || 0.4),
  aiAdminUserIds: (process.env.AI_ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean),

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

// Fail on invalid numbers instead of silently calculating incorrect costs.
for (const value of [config.qwenTimeoutMs, config.qwenMaxOutputTokens, config.qwenMaxInputChars]) {
  if (!Number.isInteger(value) || value <= 0) throw new Error('Invalid Qwen request limits');
}
for (const value of [config.qwenInputPrice, config.qwenCachedInputPrice, config.qwenOutputPrice]) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid Qwen token prices');
}
if (!config.qwenApiKey) console.warn('Qwen API is not configured. Set QWEN_API_KEY in backend .env.');

if (config.qwenMaxInputChars > 60000) throw new Error('Qwen input character limit exceeds the supported pricing tier');
