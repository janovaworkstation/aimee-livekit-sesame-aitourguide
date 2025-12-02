#!/usr/bin/env python3
"""
Entry point for running the AImee agent as a Python module.
Allows execution via: python -m aimee_agent
"""

from aimee_agent import logger

if __name__ == "__main__":
    try:
        # Import and run the main agent
        import aimee_agent

        # The main execution is handled by aimee_agent.py
        logger.info("AImee Agent module entry point - delegating to main agent")

    except Exception as e:
        logger.error(f"Failed to start AImee agent: {e}")
        raise