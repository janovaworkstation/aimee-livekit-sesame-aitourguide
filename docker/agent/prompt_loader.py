"""
AImee Prompt Loader

Centralized loader for agent prompts stored in external markdown files.
This module is the single source of truth for agent prompts.

To modify AImee's behavior, edit the corresponding .md files in /config/prompts/
instead of changing code.
"""

import os
import logging
from pathlib import Path

# Configure logger
logger = logging.getLogger("prompt-loader")

# Path to prompt files in the Docker container
PROMPTS_BASE_PATH = Path("/app/config/prompts")

def _load_prompt(filename: str) -> str:
    """
    Generic prompt loader with error handling

    Args:
        filename: Name of the prompt file to load

    Returns:
        str: Content of the prompt file

    Raises:
        FileNotFoundError: If the prompt file doesn't exist
        ValueError: If the prompt file is empty
    """
    prompt_path = PROMPTS_BASE_PATH / filename

    try:
        if not prompt_path.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

        content = prompt_path.read_text(encoding='utf-8').strip()

        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")

        logger.info(f"Loaded prompt: {filename}")
        return content

    except Exception as error:
        logger.error(f"Failed to load prompt from {prompt_path}: {error}")
        raise

def get_aimee_system_prompt() -> str:
    """
    Load AImee's main system prompt

    Returns:
        str: AImee's system prompt for the LiveKit agent
    """
    return _load_prompt('aimee_system_prompt.md')

def validate_prompt_files() -> bool:
    """
    Validate that all required prompt files are available

    Returns:
        bool: True if all prompt files are valid, False otherwise
    """
    try:
        get_aimee_system_prompt()
        logger.info("All prompt files validated successfully")
        return True
    except Exception as error:
        logger.error(f"Prompt validation failed: {error}")
        return False