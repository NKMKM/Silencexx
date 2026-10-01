# Ollama Integration Guide

## Overview

CloudMind backend has been migrated from Google Gemini API to Ollama, an open-source LLM framework that runs locally on your machine. This gives you full control over the AI models and complete privacy for user conversations.

## Prerequisites

### Install Ollama

1. **Download and Install Ollama**
   - Visit https://ollama.ai
   - Download the installer for your OS (Windows, macOS, Linux)
   - Follow the installation instructions

### Install a Model

1. **Pull a Model**
   ```bash
   ollama pull mistral
   ```

   **Recommended Models:**
   - `mistral` - Fast, good for general purpose conversations (7B)
   - `neural-chat` - Optimized for conversations (7B)
   - `openchat` - Great for chatting (3.5B, faster)
   - `zephyr` - Good instruction following (7B)
   - `llama2` - General purpose (7B or 13B)
   - `dolphin-mixtral` - More creative and knowledgeable (46GB)

   ```bash
   # Example: Pull Mistral
   ollama pull mistral

   # Example: Pull Neural Chat (better for conversations)
   ollama pull neural-chat

   # List all downloaded models
   ollama list
   ```

## Setup

### 1. Configure Environment Variables

1. **Copy the example .env file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   ```env
   # Ollama Configuration
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=mistral

   # Rest of the configuration
   PORT=3000
   NODE_ENV=development
   # ... database and other settings
   ```

3. **Update `OLLAMA_MODEL`** to match the model you pulled:
   ```env
   OLLAMA_MODEL=mistral
   ```

### 2. Start Ollama Server

**Option 1: Run Ollama in Background**

Open a terminal and run:
```bash
ollama serve
```

This will start the Ollama server at `http://localhost:11434`

The server will:
- Load your selected model into memory
- Listen for requests on port 11434
- Keep running in the background

**Option 2: Run Ollama as a Service** (Windows)
- Ollama can be set to run automatically on startup
- Check Settings in the Ollama application

**Option 3: Run with Custom Configuration**
```bash
# Specify a different port
ollama serve --port 11435

# Specify GPU memory
OLLAMA_NUM_GPU=1 ollama serve
```

### 3. Start the Backend Server

**In a separate terminal:**

```bash
# Install dependencies (first time)
npm install

# Start development server
npm run dev

# Or build and run production
npm run build
npm start
```

The backend will:
- Connect to Ollama at startup
- Verify the model is available
- Start listening for API requests

## System Requirements

### Minimum Requirements
- **CPU**: Dual-core processor
- **RAM**: 8GB minimum (16GB+ recommended)
- **Storage**: 5GB for models (varies by model size)
- **GPU**: Optional but recommended for better performance

### Recommended Setup
- **CPU**: Quad-core or better
- **RAM**: 16GB+ 
- **Storage**: 20GB+ (for multiple models)
- **GPU**: NVIDIA (CUDA), AMD (ROCm), or Apple Silicon (Metal)

### Model Sizes
- Small (3.5B): ~2-4GB RAM needed
- Medium (7B): ~4-8GB RAM needed  
- Large (13B): ~8-16GB RAM needed
- Extra Large (46B+): 24GB+ RAM needed

## Model Configuration

### Change the AI Model

To use a different model:

1. **Pull the model:**
   ```bash
   ollama pull neural-chat
   ```

2. **Update `.env`:**
   ```env
   OLLAMA_MODEL=neural-chat
   ```

3. **Restart backend:**
   ```bash
   npm run dev
   ```

### Fine-tuning Model Behavior

In `backend/src/ai.ts`, you can adjust:

```typescript
const responsePromise = ollamaClient.post('/api/chat', {
  model: config.ollamaModel,
  messages: [...],
  stream: false,
  options: {
    temperature: 0.7,      // 0.0-2.0: Higher = more creative, lower = more focused
    top_p: 0.95,          // 0.0-1.0: Nucleus sampling
    top_k: 40,            // Controls diversity via top-k filtering
  }
});
```

- **temperature**: 
  - 0.0-0.5: More focused, deterministic
  - 0.7: Balanced (default)
  - 1.0-2.0: More creative, varied

## Troubleshooting

### Error: "Connection refused to localhost:11434"

**Solution:**
1. Make sure Ollama is running: `ollama serve`
2. Check if port 11434 is in use: `netstat -an | findstr 11434` (Windows)
3. Try a different port in `.env`: `OLLAMA_URL=http://localhost:11435`

### Error: "Model not found"

**Solution:**
1. Pull the model: `ollama pull mistral`
2. Verify it's installed: `ollama list`
3. Check spelling in `.env`

### Slow Response Time

**Solutions:**
1. Use a smaller model: `openchat` instead of `mistral`
2. Increase RAM or use a GPU
3. Close other applications to free up memory
4. Check Ollama memory usage: Monitor in system settings

### High Memory Usage

**Solutions:**
1. Use a smaller model
2. Set `OLLAMA_NUM_GPU=1` to use GPU instead of RAM
3. Restart Ollama to free memory: `ollama serve`

### Port Already in Use

**Solution:**
Change the port in Ollama command:
```bash
ollama serve --port 11435
```

And update `.env`:
```env
OLLAMA_URL=http://localhost:11435
```

## Performance Tips

### 1. GPU Acceleration (Much Faster)
```bash
# For NVIDIA GPUs (CUDA)
ollama serve

# For AMD GPUs (ROCm) - Linux only
OLLAMA_CUDA_DRIVER=/path/to/cuda ollama serve

# For Apple Silicon (Metal)
# Automatically detected - no configuration needed
```

### 2. CPU Optimization
```bash
# Use all CPU cores
OLLAMA_NUM_CPU=4 ollama serve

# Limit CPU threads
OLLAMA_NUM_CPU=2 ollama serve
```

### 3. Memory Management
```bash
# Preload model on startup (faster first request)
ollama pull mistral

# Run model in background for faster responses
ollama serve &
```

### 4. Model Selection for Speed
- **Fastest**: openchat (3.5B) - ~1-2 tokens/sec
- **Balanced**: neural-chat (7B) - ~1-2 tokens/sec with good quality
- **Best Quality**: zephyr (7B) - ~1 token/sec but higher quality

## Multiple Models

You can have multiple models installed:

```bash
ollama pull mistral
ollama pull neural-chat
ollama pull zephyr
ollama list
```

Then switch between them by changing `OLLAMA_MODEL` in `.env`

## API Endpoints

The backend provides these main endpoints:

```
POST /api/chat/send - Send a message to AI
POST /api/transcribe - Transcribe audio
POST /api/mood-analyze - Analyze mood from text
GET /health - Server health check
```

All requests are handled through the Ollama integration in `backend/src/ai.ts`

## Running in Production

For production deployment:

1. **Use Ollama Docker:**
   ```bash
   docker run -d -v ollama:/root/.ollama -p 11434:11434 ollama/ollama
   ```

2. **Update Backend Configuration:**
   ```env
   NODE_ENV=production
   OLLAMA_URL=http://ollama-service:11434
   ```

3. **Monitor Resources:**
   - Ensure server has enough RAM
   - Monitor Ollama process
   - Set up auto-restart if Ollama crashes

## Migration from Gemini

### What Changed:
- Removed: `@google/generative-ai` dependency
- Added: Axios for HTTP requests
- Changed: `ai.ts` to use Ollama API instead of Gemini
- Removed: Proxy code for Gemini API access

### API Compatibility:
- All functions work the same way
- Response format is identical
- No changes needed in `server.ts` routes

### Environment Variables:
Old:
```env
GEMINI_API_KEY=xxx
```

New:
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

## Advanced Configuration

### Custom System Prompt

Edit `SYSTEM_PROMPT` in `backend/src/ai.ts` to customize AI behavior.

### Request Timeout

Default: 60 seconds. Adjust in `backend/src/ai.ts`:
```typescript
const ollamaClient = axios.create({
  baseURL: config.ollamaUrl,
  timeout: 60000, // milliseconds
});
```

### Streaming Responses

Currently disabled (`stream: false`). To enable streaming:
```typescript
// Change stream: false to stream: true
// Handle streaming response chunks
```

## Support

For issues:
1. Check Ollama logs: `ollama serve` (terminal)
2. Verify port connectivity
3. Check model availability: `ollama list`
4. Review backend logs: `npm run dev`

## Resources

- Ollama Official: https://ollama.ai
- Available Models: https://ollama.ai/library
- Documentation: https://github.com/jmorganca/ollama
