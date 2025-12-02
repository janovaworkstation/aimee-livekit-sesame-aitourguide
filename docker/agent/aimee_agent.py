#!/usr/bin/env python3
"""
AImee LiveKit Voice Agent

A voice AI agent using the LiveKit Agents framework that:
1. Joins a LiveKit room as "aimee-agent"
2. Listens to user audio from mobile app
3. Uses OpenAI STT + Chat Completions + TTS for conversation intelligence
4. Responds with natural speech via LiveKit audio

PHASE 8 - THREE MODEL ARCHITECTURE:
- LLM Model: ACTIVELY USED for Chat Completions (get_llm_model())
- TTS Model: RESERVED for future GPT-4o-TTS integration (get_tts_model())
- Realtime Model: RESERVED for future Realtime STS API (get_realtime_model())

EXTERNALIZED PROMPTS:
AImee's main system prompt is now stored in /config/prompts/aimee_system_prompt.md.
To change AImee's persona or introduction, edit that file rather than this code.

Current Architecture: LiveKit Agents → STT → Text LLM → TTS → Audio Response
Future Architecture: Direct GPT-4o-TTS or Realtime STS models

This replaces the previous Node.js implementation that had audio frame access limitations.
"""

import asyncio
import logging
import os

from livekit.agents import (
    Agent,
    AgentSession,
    AgentServer,
    AutoSubscribe,
    JobContext,
    JobProcess,
    cli,
)

# Try to import StopResponse for preventing further agent processing
try:
    from livekit.agents import StopResponse
except ImportError:
    # If StopResponse is not available, we'll use a different approach
    StopResponse = None
from livekit.plugins import openai, silero
from aimee_model_config import get_llm_model, get_tts_model, get_realtime_model
from prompt_loader import get_aimee_system_prompt
from backend_client import backend_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("aimee-agent")

# AImee's personality and behavior loaded from external file
def get_aimee_instructions() -> str:
    """Get AImee's system instructions from external prompt file."""
    return get_aimee_system_prompt()

# Environment configuration
def get_config():
    """Load configuration from environment variables"""
    config = {
        "livekit_url": os.environ.get("LIVEKIT_URL"),
        "livekit_api_key": os.environ.get("LIVEKIT_API_KEY"),
        "livekit_api_secret": os.environ.get("LIVEKIT_API_SECRET"),
        "openai_api_key": os.environ.get("OPENAI_API_KEY"),
        "room_name": os.environ.get("ROOM_NAME", "aimee-phase1"),
        "participant_identity": os.environ.get("PARTICIPANT_IDENTITY", "aimee-agent"),
        "openai_model": get_llm_model(),
        "use_backend_router": os.environ.get("USE_BACKEND_ROUTER", "false").lower() == "true",
    }

    # Validate required environment variables
    required_vars = ["livekit_url", "livekit_api_key", "livekit_api_secret", "openai_api_key"]
    missing_vars = [var for var in required_vars if not config[var]]

    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    # Log future-ready model configuration
    tts_model = get_tts_model()
    realtime_model = get_realtime_model()

    logger.info("AImee Agent Configuration:")
    logger.info(f"  LiveKit URL: {config['livekit_url']}")
    logger.info(f"  Room Name: {config['room_name']}")
    logger.info(f"  Agent Identity: {config['participant_identity']}")
    logger.info(f"  OpenAI LLM Model (ACTIVE): {config['openai_model']}")
    logger.info(f"  OpenAI TTS Model (RESERVED): {tts_model}")
    logger.info(f"  OpenAI Realtime Model (RESERVED): {realtime_model}")
    logger.info(f"  Backend Router Enabled: {config['use_backend_router']}")

    return config

# Create AImee agent class
class AImeeAgent(Agent):
    def __init__(self, use_backend_router=False):
        super().__init__(
            instructions=get_aimee_instructions(),
        )
        self.use_backend_router = use_backend_router

    async def on_enter(self):
        """Called when agent becomes active"""
        logger.info("AImee agent entering session - sending greeting using main system prompt")

        # Always use main AImee system prompt for initial greeting
        # Backend routing is only used for user questions, not initial greeting
        await self.session.generate_reply(
            instructions="Greet the user warmly and let them know you're AImee, their AI tour guide assistant, ready to help with location information and travel guidance."
        )

    async def on_user_turn_completed(self, turn_ctx, new_message):
        """Handle user turn completion - override to route through backend or direct OpenAI"""
        user_input = new_message.text_content
        logger.info(f"Received user turn completed: {user_input[:100]}{'...' if len(user_input) > 100 else ''}")

        if self.use_backend_router:
            # Try backend processing - if it succeeds, stop further processing
            backend_handled = await self._handle_backend_speech(user_input)
            if backend_handled:
                # Prevent LiveKit from continuing with standard LLM processing
                # This prevents double responses and additional OpenAI calls
                if StopResponse is not None:
                    logger.info("Using StopResponse to prevent double processing")
                    raise StopResponse()
                else:
                    # Alternative approach: clear the message content to prevent LLM processing
                    logger.info("StopResponse not available - clearing message to prevent LLM processing")
                    new_message.text_content = ""
                    return
            else:
                # Backend failed, fall back to standard processing
                logger.info("Backend processing failed, falling back to standard LiveKit processing")
                await super().on_user_turn_completed(turn_ctx, new_message)
        else:
            # Use standard LiveKit Agent behavior for direct OpenAI
            await super().on_user_turn_completed(turn_ctx, new_message)

    async def _handle_backend_speech(self, user_input: str) -> bool:
        """
        Route user speech through backend multi-agent system.

        Returns:
            bool: True if backend processing was successful, False if fallback needed
        """
        try:
            backend_response = await backend_client.chat(
                user_id="voice-user",
                user_input=user_input,
                context={"mode": "voice", "source": "livekit"}
            )

            if backend_response.success:
                logger.info(f"Backend response successful via {backend_response.agent} agent")
                logger.info(f"Response: {backend_response.response[:100]}{'...' if len(backend_response.response) > 100 else ''}")

                # Use TTS to speak the backend response
                await self.session.say(backend_response.response, allow_interruptions=True, add_to_chat_ctx=True)
                return True  # Backend processing successful
            else:
                logger.error(f"Backend response failed: {backend_response.error}")
                return False  # Backend processing failed

        except Exception as e:
            logger.error(f"Backend speech handling error: {e}")
            return False  # Backend processing failed

    async def on_exit(self):
        """Called when agent is replaced or session ends"""
        logger.info("AImee agent exiting session")
        # Close backend client session
        await backend_client.close()

# Create the AgentServer
server = AgentServer()

def prewarm(proc: JobProcess):
    """Preload models to reduce latency"""
    config = get_config()
    logger.info("Prewarming AImee agent models...")
    proc.userdata["vad"] = silero.VAD.load()
    proc.userdata["config"] = config

server.setup_fnc = prewarm

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    """Main entry point for the AImee voice agent"""
    config = ctx.proc.userdata["config"]

    # Set logging context
    ctx.log_context_fields = {"room": ctx.room.name}

    logger.info(f"AImee Agent starting session in room '{ctx.room.name}'")

    # Create agent session with OpenAI STT, LLM, and TTS
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],  # Pre-loaded VAD
        stt=openai.STT(api_key=config["openai_api_key"]),  # Speech-to-text
        llm=openai.LLM(
            model=config["openai_model"],
            api_key=config["openai_api_key"],
        ),  # Language model
        tts=openai.TTS(
            api_key=config["openai_api_key"],
            voice="alloy",  # Natural voice for AImee
        ),
    )

    logger.info("AImee agent session created")

    # Start the agent session with backend router configuration
    aimee_agent = AImeeAgent(use_backend_router=config["use_backend_router"])
    await session.start(agent=aimee_agent, room=ctx.room)

    router_mode = "Backend Router" if config["use_backend_router"] else "Direct OpenAI"
    logger.info(f"AImee is now ready to assist using {router_mode}! 🎤")

if __name__ == "__main__":
    """Run the LiveKit Agents worker"""
    logger.info("Starting AImee LiveKit Agents worker...")

    # Configure and start the LiveKit Agents worker
    cli.run_app(server)