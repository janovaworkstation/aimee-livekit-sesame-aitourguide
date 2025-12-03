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

SESSION HANDLING:
- Tracks participant connections to detect reconnections
- Resets session state when user force-quits and rejoins
- Loads user memory from backend on each new session
"""

import asyncio
import logging
import os
import time
from typing import Optional, Dict, Any

from livekit.agents import (
    Agent,
    AgentSession,
    AgentServer,
    AutoSubscribe,
    JobContext,
    JobProcess,
    cli,
)
from livekit import rtc

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

# Track active sessions per room to detect reconnections
_active_sessions: Dict[str, Dict[str, Any]] = {}

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
    def __init__(self, use_backend_router=False, room_name: str = "", is_reconnection: bool = False):
        super().__init__(
            instructions=get_aimee_instructions(),
        )
        self.use_backend_router = use_backend_router
        self.room_name = room_name
        self.is_reconnection = is_reconnection
        self._session_started = False

    async def on_enter(self):
        """Called when agent becomes active"""
        # Prevent duplicate greetings if on_enter is called multiple times
        if self._session_started:
            logger.info("AImee agent on_enter called but session already started - skipping greeting")
            return
        self._session_started = True

        if self.is_reconnection:
            logger.info("AImee agent entering session - RECONNECTION detected, sending welcome back message")
        else:
            logger.info("AImee agent entering session - NEW session, sending greeting")

        # Wait a moment for mobile app audio tracks to be fully established
        # This prevents the greeting from being sent before mobile can receive it
        await asyncio.sleep(2.0)

        # Check if we should use backend routing for memory-aware greeting
        if self.use_backend_router:
            # Use backend to check for existing user memory and provide appropriate greeting
            try:
                if self.is_reconnection:
                    # User reconnected - acknowledge the reconnection and use their name if known
                    system_message = "[SYSTEM: The user has just reconnected after briefly leaving. Welcome them back warmly. If you know their name, use it. Keep it brief - just acknowledge you're glad they're back and ask how you can help.]"
                else:
                    # New session - check for stored name
                    system_message = "[SYSTEM: This is a new session. Check if the user has a stored name and greet accordingly. If no name is stored, ask for their name. If a name is stored, greet them by name.]"

                backend_response = await backend_client.chat(
                    user_id="voice-user",
                    user_input=system_message,
                    context={
                        "mode": "voice",
                        "source": "livekit",
                        "session_start": True,
                        "is_reconnection": self.is_reconnection
                    }
                )

                if backend_response.success:
                    logger.info(f"Backend memory-aware greeting successful via {backend_response.agent} agent")
                    await self.session.say(backend_response.response, allow_interruptions=True, add_to_chat_ctx=True)
                    return
                else:
                    logger.error(f"Backend greeting failed: {backend_response.error}")
            except Exception as e:
                logger.error(f"Backend greeting error: {e}")

        # Fallback: Always use main AImee system prompt for initial greeting
        # This happens when backend routing is disabled or fails
        if self.is_reconnection:
            await self.session.generate_reply(
                instructions="Welcome the user back briefly. They just reconnected after a brief interruption. Ask how you can help them."
            )
        else:
            await self.session.generate_reply(
                instructions="Greet the user warmly and let them know you're AImee, their AI tour guide assistant, ready to help with location information and travel guidance. Ask what you should call them."
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
                # Backend failed, fall back to direct LLM processing
                logger.info("Backend processing failed, using direct LLM fallback")
                await self.session.generate_reply()
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
    room_name = ctx.room.name

    # Set logging context
    ctx.log_context_fields = {"room": room_name}

    logger.info(f"AImee Agent starting session in room '{room_name}'")

    # Check if this is a reconnection (user force-quit and rejoined)
    is_reconnection = False
    if room_name in _active_sessions:
        last_session = _active_sessions[room_name]
        # If we had a session within the last 5 minutes, treat as reconnection
        time_since_last = time.time() - last_session.get("last_seen", 0)
        if time_since_last < 300:  # 5 minutes
            is_reconnection = True
            logger.info(f"Detected RECONNECTION - user was last seen {time_since_last:.1f}s ago")
        else:
            logger.info(f"Previous session expired ({time_since_last:.1f}s ago) - treating as new session")
    else:
        logger.info("No previous session found - this is a new session")

    # Track this session
    _active_sessions[room_name] = {
        "started": time.time(),
        "last_seen": time.time(),
        "participant_connected": False
    }

    # Session holder to track current session state for reconnection handling
    # had_active_session: prevents duplicate sessions on fresh start (only reconnect if we HAD a session that closed)
    session_holder: Dict[str, Any] = {"session": None, "active": False, "had_active_session": False}

    # Helper function to create a new agent session
    async def create_agent_session(is_reconnect: bool = False):
        """Create and start a new agent session"""
        new_session = AgentSession(
            vad=ctx.proc.userdata["vad"],
            stt=openai.STT(api_key=config["openai_api_key"]),
            llm=openai.LLM(
                model=config["openai_model"],
                api_key=config["openai_api_key"],
            ),
            tts=openai.TTS(
                api_key=config["openai_api_key"],
                voice="alloy",
            ),
        )

        new_agent = AImeeAgent(
            use_backend_router=config["use_backend_router"],
            room_name=room_name,
            is_reconnection=is_reconnect
        )

        session_holder["session"] = new_session
        session_holder["active"] = True
        session_holder["had_active_session"] = True  # Mark that we've had at least one session

        await new_session.start(agent=new_agent, room=ctx.room)

        router_mode = "Backend Router" if config["use_backend_router"] else "Direct OpenAI"
        reconnect_status = "RECONNECTION" if is_reconnect else "NEW SESSION"
        logger.info(f"AImee is ready ({reconnect_status}) using {router_mode}!")

    # Set up participant tracking for disconnect/reconnect detection
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant):
        if participant.identity != config["participant_identity"]:
            logger.info(f"Participant connected: {participant.identity}")
            _active_sessions[room_name]["last_seen"] = time.time()
            _active_sessions[room_name]["participant_connected"] = True

            # Only create a new session if we previously HAD an active session that was closed
            # This prevents duplicate sessions on fresh start (where initial session is still being created)
            if not session_holder["active"] and session_holder["had_active_session"]:
                logger.info("Session was closed - creating new session for reconnected participant")
                asyncio.create_task(create_agent_session(is_reconnect=True))
            elif not session_holder["active"]:
                logger.info("No previous session existed - initial session creation will handle this participant")

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant):
        if participant.identity != config["participant_identity"]:
            logger.info(f"Participant disconnected: {participant.identity}")
            _active_sessions[room_name]["last_seen"] = time.time()
            _active_sessions[room_name]["participant_connected"] = False
            # Mark session as inactive - it will be closed by LiveKit automatically
            session_holder["active"] = False

    # Create initial agent session
    logger.info("Creating initial AImee agent session")
    await create_agent_session(is_reconnect=is_reconnection)

if __name__ == "__main__":
    """Run the LiveKit Agents worker"""
    logger.info("Starting AImee LiveKit Agents worker...")

    # Configure and start the LiveKit Agents worker
    cli.run_app(server)