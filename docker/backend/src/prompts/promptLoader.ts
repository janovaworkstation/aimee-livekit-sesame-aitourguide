/**
 * AImee Prompt Loader
 *
 * Centralized loader for agent prompts stored in external markdown files.
 * These functions are the single source of truth for agent prompts.
 *
 * To modify agent behavior, edit the corresponding .md files in /config/prompts/
 * instead of changing code.
 */

import fs from 'fs';
import path from 'path';

// Path to prompt files - configurable for testing vs Docker
// In Docker: /app/config/prompts
// For local testing: ../../../config/prompts (relative to this file)
const PROMPTS_BASE_PATH = process.env.PROMPTS_PATH ||
  (fs.existsSync('/app/config/prompts') ?
    '/app/config/prompts' :
    path.resolve(__dirname, '../../../../config/prompts'));

/**
 * Generic prompt loader with error handling
 */
function loadPrompt(filename: string): string {
  const promptPath = path.join(PROMPTS_BASE_PATH, filename);

  try {
    if (!fs.existsSync(promptPath)) {
      throw new Error(`Prompt file not found: ${promptPath}`);
    }

    const content = fs.readFileSync(promptPath, 'utf-8').trim();

    if (!content) {
      throw new Error(`Prompt file is empty: ${promptPath}`);
    }

    console.log(`Loaded prompt: ${filename}`);
    return content;

  } catch (error) {
    console.error(`Failed to load prompt from ${promptPath}:`, error);
    throw new Error(`Prompt loading failed for ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load AImee's main system prompt
 */
export function getAimeeSystemPrompt(): string {
  return loadPrompt('aimee_system_prompt.md');
}

/**
 * Load Navigator agent prompt
 */
export function getNavigatorPrompt(): string {
  return loadPrompt('agent_navigator.md');
}

/**
 * Load Historian agent prompt
 */
export function getHistorianPrompt(): string {
  return loadPrompt('agent_historian.md');
}

/**
 * Load Experience agent prompt
 */
export function getExperiencePrompt(): string {
  return loadPrompt('agent_experience.md');
}

/**
 * Load Memory agent prompt
 */
export function getMemoryPrompt(): string {
  return loadPrompt('agent_memory.md');
}

/**
 * Load all prompts and validate availability (useful for startup checks)
 */
export function validateAllPrompts(): { [key: string]: boolean } {
  const results: { [key: string]: boolean } = {};

  const promptLoaders = {
    'aimee_system': getAimeeSystemPrompt,
    'navigator': getNavigatorPrompt,
    'historian': getHistorianPrompt,
    'experience': getExperiencePrompt,
    'memory': getMemoryPrompt
  };

  for (const [name, loader] of Object.entries(promptLoaders)) {
    try {
      loader();
      results[name] = true;
    } catch (error) {
      console.error(`Prompt validation failed for ${name}:`, error);
      results[name] = false;
    }
  }

  return results;
}