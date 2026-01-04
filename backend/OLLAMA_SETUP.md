# Ollama Setup Guide

This guide will help you set up Ollama for local AI processing instead of using OpenAI API.

## Prerequisites

1. **Install Ollama**: Download and install Ollama from https://ollama.ai
   - macOS: `brew install ollama` or download from website
   - Linux: Follow instructions on https://ollama.ai
   - Windows: Download installer from https://ollama.ai

2. **Start Ollama**: Make sure Ollama is running
   ```bash
   ollama serve
   ```
   This starts the Ollama server on `http://localhost:11434`

## Download Required Models

You need to download two models:

1. **Vision Model** (for document extraction):
   ```bash
   ollama pull llava:latest
   ```
   This model can read images and extract text from documents.

2. **Text Model** (for categorization, insights, chat, etc.):
   ```bash
   ollama pull llama3:latest
   ```
   Or use another model like:
   - `mistral:latest` (smaller, faster)
   - `llama3.1:latest` (newer version)
   - `qwen2.5:latest` (alternative)

## Configure Backend

Add these environment variables to your `backend/.env` file:

```env
# Enable Ollama (set to 'true' to use local models)
USE_OLLAMA=true

# Ollama configuration (optional, defaults shown)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_VISION_MODEL=llava:latest
OLLAMA_TEXT_MODEL=llama3:latest
```

## Verify Setup

1. **Check Ollama is running**:
   ```bash
   curl http://localhost:11434/api/tags
   ```
   Should return a list of installed models.

2. **Test a model**:
   ```bash
   ollama run llama3 "Hello, how are you?"
   ```

3. **Test vision model**:
   ```bash
   ollama run llava "What's in this image?" --image path/to/image.jpg
   ```

## Usage

Once configured:

1. **Start the backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the extraction worker**:
   ```bash
   npm run worker
   ```

3. **Upload documents** - The system will now use Ollama instead of OpenAI!

## Switching Back to OpenAI

To switch back to OpenAI:

1. Set `USE_OLLAMA=false` in `.env` (or remove the line)
2. Make sure `OPENAI_API_KEY` is set in `.env`
3. Restart the server and worker

## Model Recommendations

### For Vision (Document Extraction):
- **llava:latest** - Good balance of accuracy and speed
- **llava:13b** - More accurate but slower
- **llava:7b** - Faster but less accurate

### For Text (Categorization, Insights, Chat):
- **llama3:latest** - Good general purpose model
- **llama3.1:latest** - Newer, improved version
- **mistral:latest** - Smaller, faster, good for simple tasks
- **qwen2.5:latest** - Alternative with good performance

## Troubleshooting

### "Connection refused" error
- Make sure Ollama is running: `ollama serve`
- Check the port: `curl http://localhost:11434/api/tags`

### "Model not found" error
- Download the model: `ollama pull <model-name>`
- Check installed models: `ollama list`

### Slow processing
- Use smaller models (e.g., `llava:7b` instead of `llava:13b`)
- Make sure you have enough RAM (models load into memory)
- Consider using GPU acceleration if available

### Poor extraction quality
- Try a larger vision model: `ollama pull llava:13b`
- Ensure document images are clear and high quality
- Check logs for specific errors

## Performance Tips

1. **First run is slow** - Models are downloaded and loaded on first use
2. **Keep models in memory** - Ollama caches models, so subsequent requests are faster
3. **Use appropriate model sizes** - Larger models are more accurate but slower
4. **GPU acceleration** - If you have a compatible GPU, Ollama will use it automatically

## Cost Comparison

- **Ollama**: Free, runs locally, no API costs
- **OpenAI**: Pay per API call, costs can add up with many documents

For testing and development, Ollama is perfect. For production with high volume, you might want to use OpenAI or a cloud provider.

