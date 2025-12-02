"""
AImee OpenAI Model Configuration

Centralized configuration for OpenAI model selection across the AImee agent.
This ensures consistent model usage and makes it easy to switch models via environment variables.

PHASE 8 - THREE MODEL ARCHITECTURE:
- LLM Model: Used TODAY for text-based Chat Completions (currently gpt-4o-mini)
- TTS Model: RESERVED for future GPT-4o-TTS integration (currently not used)
- Realtime Model: RESERVED for future OpenAI Realtime STS API (currently not used)

Current behavior: STT + LLM (gpt-4o-mini) + LiveKit TTS
Future behavior: Direct GPT-4o-TTS or Realtime STS models with minimal code changes
"""

import os

def get_llm_model() -> str:
    """
    Get the OpenAI LLM model for text completions.

    This model is ACTIVELY USED for Chat Completions API in the current
    STT + LLM + TTS pipeline.

    Returns:
        str: Model name, defaults to 'gpt-4o-mini' if OPENAI_MODEL env var not set

    Environment Variables:
        OPENAI_MODEL: Override the default LLM model (optional)
    """
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")

def get_tts_model() -> str:
    """
    Get the OpenAI TTS model for voice synthesis.

    RESERVED FOR FUTURE USE: This model will be used when we upgrade to
    direct GPT-4o-TTS integration. Currently, LiveKit Agents handles TTS
    and this model configuration is not actively used.

    Returns:
        str: Model name, defaults to 'gpt-4o-tts' if OPENAI_TTS_MODEL env var not set

    Environment Variables:
        OPENAI_TTS_MODEL: Override the default TTS model (optional)
    """
    return os.getenv("OPENAI_TTS_MODEL", "gpt-4o-tts")

def get_realtime_model() -> str:
    """
    Get the OpenAI Realtime model for speech-to-speech conversation.

    RESERVED FOR FUTURE USE: This model will be used when we upgrade to
    OpenAI Realtime STS API. Currently not used - we use STT + LLM + TTS pipeline.

    Returns:
        str: Model name, defaults to 'gpt-4o-realtime-preview-2024-10-01' if env var not set

    Environment Variables:
        OPENAI_REALTIME_MODEL: Override the default Realtime model (optional)
    """
    return os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-2024-10-01")

# Legacy function for backward compatibility
def get_default_llm_model() -> str:
    """Legacy function - use get_llm_model() instead."""
    return get_llm_model()

def get_model_config() -> dict:
    """
    Get complete model configuration for the AImee agent.

    Returns:
        dict: Configuration dictionary with all model settings
    """
    llm_model = get_llm_model()
    tts_model = get_tts_model()
    realtime_model = get_realtime_model()

    return {
        "llm_model": llm_model,
        "tts_model": tts_model,
        "realtime_model": realtime_model,
        "temperature": 0.7,
        "max_tokens": 500,
        "description": {
            "llm": f"ACTIVE: {llm_model} for Chat Completions API",
            "tts": f"RESERVED: {tts_model} for future GPT-4o-TTS integration",
            "realtime": f"RESERVED: {realtime_model} for future Realtime STS integration"
        }
    }