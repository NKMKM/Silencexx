import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Ollama configuration
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'mistral', // или 'neural-chat', 'openchat' и т.д.
  
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Proxy configuration (if needed)
  httpProxy: process.env.HTTP_PROXY || process.env.HTTPS_PROXY || '',
};

// Validate Ollama configuration
if (!config.ollamaUrl || !config.ollamaModel) {
  console.warn('⚠️ Ollama configuration incomplete:');
  console.warn('   OLLAMA_URL:', config.ollamaUrl);
  console.warn('   OLLAMA_MODEL:', config.ollamaModel);
}
