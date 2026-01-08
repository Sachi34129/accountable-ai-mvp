# Hugging Face API Configuration

## Quick Setup

Add these lines to your `backend/.env` file:

```env
# Hugging Face API (Required for AI features)
HUGGINGFACE_API_KEY=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
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2

# Optional: Comment out or remove old Ollama config
# USE_OLLAMA=true
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_VISION_MODEL=llava:latest
# OLLAMA_TEXT_MODEL=llama3:latest
```

## What Changed

### ✅ Benefits
- **No Local Services Required**: PostgreSQL, Redis, and Ollama are NO LONGER needed for AI operations
- **Simple Deployment**: Just add API key and run
- **Reliable**: Cloud-based inference with automatic scaling
- **Accountable AI**: Built-in system prompt enforcing responsible AI behavior

### 🔄 Migration from Ollama
- All AI functions now use Hugging Face Inference API
- Same API interface - no changes to routes or frontend
- Better error handling and retry logic
- Explicit uncertainty and bias awareness in responses

## Accountable AI Features

All AI responses now include:
1. **Factual Answers**: Based on provided data and evidence
2. **Transparent Reasoning**: Clear explanations of how conclusions were reached
3. **Bias Awareness**: Acknowledgment of potential biases or limitations
4. **Uncertainty Handling**: Explicit statements when uncertain or making assumptions

## Testing

### 1. Start Backend
```bash
cd backend
npm install  # Install @huggingface/inference
npm run dev
```

Expected output:
```
🤗 AI MODE: Hugging Face Inference API
   Model: mistralai/Mistral-7B-Instruct-v0.2
   Accountable AI: Enabled
Server running on port 3000
```

### 2. Test Chat Endpoint
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{"message": "What are my top spending categories?"}'
```

### 3. Test Categorization
Upload a document and check if transactions are categorized with explanations.

## Troubleshooting

### Error: "HUGGINGFACE_API_KEY is required"
- Make sure you've added the API key to `backend/.env`
- Restart the backend server after adding the key

### Error: "Rate limit exceeded"
- Hugging Face has rate limits on free tier
- Wait a few minutes and try again
- Consider upgrading to Pro tier for higher limits

### Error: "Model not found"
- The default model is `mistralai/Mistral-7B-Instruct-v0.2`
- You can change it by setting `HUGGINGFACE_MODEL` in `.env`
- Available models: https://huggingface.co/models

## API Key Management

**Security Best Practices:**
- Never commit `.env` file to git (already in `.gitignore`)
- Rotate API keys periodically
- Use different keys for development and production
- Monitor API usage at https://huggingface.co/settings/tokens

## Model Selection

Default: `mistralai/Mistral-7B-Instruct-v0.2`

Alternative models you can try:
- `google/flan-t5-xxl` - Good for structured outputs
- `meta-llama/Llama-2-7b-chat-hf` - Strong general purpose
- `HuggingFaceH4/zephyr-7b-beta` - Good for chat

Change by setting `HUGGINGFACE_MODEL` in `.env`.
