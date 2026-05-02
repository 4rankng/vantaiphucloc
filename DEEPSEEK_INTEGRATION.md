# DeepSeek AI Integration

## Overview

The vantaiphucloc system now integrates with **DeepSeek AI** as the primary AI provider for OCR (Optical Character Recognition) of container numbers, with **Google Gemini** as an automatic fallback.

## Provider Priority

1. **DeepSeek** (primary) - Tried first if API key is available
2. **Gemini** (fallback) - Used if DeepSeek fails or no API key is configured

## Architecture

### New Files

- `backend/app/services/ai_service.py` - Unified AI service with automatic fallback logic

### Modified Files

- `backend/app/services/ocr_service.py` - Refactored to use the new AI service
- `backend/.env.example` - Added DeepSeek configuration variables

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# DeepSeek AI (primary provider)
DEEPSEEK_API_KEY=your-deepseek-api-key-here
DEEPSEEK_MODEL=deepseek-v4-pro

# Gemini AI (fallback provider)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

### API Keys

- **DeepSeek API Key**: Get one at https://platform.deepseek.com/api_keys
- **Gemini API Key**: Get one at https://aistudio.google.com/app/apikey

## Supported Models

### DeepSeek

- `deepseek-v4-pro` (recommended for production)
- `deepseek-v4-flash` (faster, lower cost)

### Gemini

- `gemini-2.5-flash` (recommended)
- `gemini-flash-latest`

## API Endpoints

### DeepSeek

- **Base URL**: `https://api.deepseek.com`
- **Endpoint**: `/chat/completions`
- **Format**: OpenAI-compatible

### Gemini

- **Base URL**: `https://generativelanguage.googleapis.com/v1beta`
- **Endpoint**: `/models/{model}:generateContent`
- **Format**: Google Gemini format

## Usage

### Image Analysis (OCR)

```python
from app.services.ai_service import analyze_image_with_fallback

result = await analyze_image_with_fallback(
    prompt="Extract container number from this image",
    image_bytes=image_data,
    mime_type="image/jpeg"
)

if result["success"]:
    print(f"Result: {result['text']}")
    print(f"Provider: {result['provider']}")  # "deepseek" or "gemini"
    print(f"Fallback used: {result['fallback_used']}")
```

### Text Analysis

```python
from app.services.ai_service import analyze_text_with_fallback

result = await analyze_text_with_fallback(
    prompt="Analyze this text",
    messages=[
        {"role": "user", "content": "Your text here"}
    ]
)

if result["success"]:
    print(f"Result: {result['text']}")
    print(f"Provider: {result['provider']}")
```

## Response Format

Both functions return a dictionary with:

```python
{
    "success": bool,           # True if the request succeeded
    "text": str | None,        # The AI's response text
    "error": str | None,       # Error message if failed
    "provider": str | None,    # "deepseek", "gemini", or None
    "fallback_used": bool      # True if Gemini was used as fallback
}
```

## Fallback Logic

1. **Check DeepSeek API key** - If not configured, skip to Gemini
2. **Try DeepSeek** - Make request to DeepSeek API
3. **Check DeepSeek response** - If success, return result
4. **Fallback to Gemini** - If DeepSeek failed, try Gemini
5. **Return Gemini result** - Success or failure

## Logging

The system logs which provider is being used:

```
[AI] Attempting DeepSeek...
[AI] DeepSeek success: MSKU1234567
[OCR] success: MSKU1234567 (provider: deepseek, fallback: False)
```

Or if fallback occurs:

```
[AI] Attempting DeepSeek...
[AI] DeepSeek failed: HTTP 500
[AI] Fallback to Gemini...
[AI] Gemini success: MSKU1234567
[OCR] success: MSKU1234567 (provider: gemini, fallback: True)
```

## OCR Workflow

1. Driver takes photo of container
2. Image is preprocessed (sharpening, contrast enhancement)
3. AI attempts to extract container number (max 3 attempts)
4. Backend validates against ISO 6346 standard
5. If all attempts fail → driver enters manually

## Benefits

### Why DeepSeek First?

- **Cost-effective**: Generally more affordable than Gemini
- **Fast response times**: Low latency for real-time OCR
- **High accuracy**: Excellent performance on text extraction
- **OpenAI-compatible**: Easy to integrate with existing tooling

### Why Gemini Fallback?

- **Reliability**: Ensures OCR continues working even if DeepSeek is down
- **Proven track record**: Gemini has been battle-tested in production
- **Multi-model support**: Can leverage Gemini's specialized capabilities if needed
- **No single point of failure**: Redundancy improves system reliability

## Dependencies

No new dependencies required! The integration uses:

- `httpx` - Already in requirements.txt for HTTP requests
- `PIL` (Pillow) - Already in requirements.txt for image processing
- `base64` - Python standard library

## Testing

To test the integration:

```bash
# Ensure both API keys are set
export DEEPSEEK_API_KEY="your-key"
export GEMINI_API_KEY="your-key"

# Run backend
cd backend && PYTHONPATH=. uvicorn app.main:app --reload

# Upload a container image via the app
# Check logs to see which provider was used
```

## Troubleshooting

### DeepSeek not being used

- Check that `DEEPSEEK_API_KEY` is set in `.env`
- Verify the API key is valid at https://platform.deepseek.com/api_keys
- Check logs for `[AI] DeepSeek failed` messages

### Gemini fallback not working

- Check that `GEMINI_API_KEY` is set in `.env`
- Verify the API key is valid at https://aistudio.google.com/app/apikey
- Check logs for `[AI] Gemini failed` messages

### OCR failing consistently

- Check image quality and lighting
- Verify container number follows ISO 6346 format
- Check both API keys are valid
- Review logs for specific error messages

## Deployment

Latest deployment:

- **Commit**: `fd3b672`
- **Docker Image**: `franknguyenvd/phucloc-backend:fd3b672`
- **Production**: https://phucloc.tingting.vip

## Documentation

- **DeepSeek API Docs**: https://api-docs.deepseek.com/
- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **ISO 6346 Standard**: Container number validation logic in `app/utils/iso6346.py`

## Future Enhancements

Potential improvements:

1. **Retry logic**: Automatic retries with exponential backoff
2. **Model selection**: Dynamic model selection based on use case
3. **Rate limiting**: Per-provider rate limiting and quotas
4. **Monitoring**: Detailed metrics on provider usage and performance
5. **A/B testing**: Compare provider performance on the same inputs
6. **Additional providers**: Add more AI providers (OpenAI, Anthropic, etc.)

## Support

For issues or questions:

1. Check logs for detailed error messages
2. Verify API keys are valid and have sufficient quotas
3. Test both providers independently using curl or Postman
4. Review this documentation for configuration details
