#!/usr/bin/env python3
"""
AImee LiveKit Voice Agent

A voice AI agent using the LiveKit Agents framework that:
1. Joins a LiveKit room as "aimee-agent"
2. Listens to user audio from mobile app
3. Uses OpenAI for conversation intelligence
4. Responds with natural speech via LiveKit audio

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
from livekit.plugins import openai, silero

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("aimee-agent")

# AImee's personality and behavior
AIMEE_SYSTEM_PROMPT = """You are AImee, a friendly and knowledgeable AI tour guide assistant.
You help people discover interesting places and provide engaging location-based information.

Key traits:
- Speak in a warm, conversational tone as if you're guiding someone on a personal tour
- Keep responses concise but informative (ideal for in-car listening)
- Focus on being helpful and engaging
- You can discuss locations, landmarks, history, and points of interest
- If you don't know something specific, acknowledge it honestly

Remember: You're designed to make travel and exploration more enjoyable and educational."""

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
        "openai_model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
    }

    # Validate required environment variables
    required_vars = ["livekit_url", "livekit_api_key", "livekit_api_secret", "openai_api_key"]
    missing_vars = [var for var in required_vars if not config[var]]

    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

    logger.info("AImee Agent Configuration:")
    logger.info(f"  LiveKit URL: {config['livekit_url']}")
    logger.info(f"  Room Name: {config['room_name']}")
    logger.info(f"  Agent Identity: {config['participant_identity']}")
    logger.info(f"  OpenAI Model: {config['openai_model']}")

    return config

# Create AImee agent class
class AImeeAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions=AIMEE_SYSTEM_PROMPT,
        )

    async def on_enter(self):
        """Called when agent becomes active"""
        logger.info("AImee agent entering session - sending greeting")
        await self.session.generate_reply(
            instructions="Greet the user warmly and let them know you're AImee, their AI tour guide assistant, ready to help with location information and travel guidance."
        )

    async def on_exit(self):
        """Called when agent is replaced or session ends"""
        logger.info("AImee agent exiting session")

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

    # Start the agent session
    await session.start(agent=AImeeAgent(), room=ctx.room)
    logger.info("AImee is now ready to assist! 🎤")

if __name__ == "__main__":
    """Run the LiveKit Agents worker"""
    logger.info("Starting AImee LiveKit Agents worker...")

    # Configure and start the LiveKit Agents worker
    cli.run_app(server)