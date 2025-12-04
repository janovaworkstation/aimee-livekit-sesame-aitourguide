// AImee Agent Brain Helper
// Phase 3: Integration layer between agents and OpenAI Realtime engine

import { testOpenAIRealtime } from '../engines/openaiRealtimeEngine';
import { ConversationContext } from '../agents/types';
import { getBrainForEnvironment } from './config';

/**
 * Core function for agents to interact with the Premium brain (OpenAI)
 * This abstracts the OpenAI integration and provides a clean interface for agents
 */
export async function runPremiumAgentPrompt(
  agentName: string,
  systemPrompt: string,
  userInput: string,
  context: ConversationContext
): Promise<string> {
  try {
    // Build comprehensive prompt with agent context
    const fullPrompt = buildAgentPrompt(agentName, systemPrompt, userInput, context);

    console.log(`Brain Helper: Processing ${agentName} request`);

    // Call the OpenAI Realtime engine (text-based for Phase 3)
    const result = await testOpenAIRealtime(fullPrompt);

    if (!result.success) {
      throw new Error(result.error || 'OpenAI request failed');
    }

    console.log(`Brain Helper: ${agentName} response generated successfully`);
    return result.response || 'No response generated';

  } catch (error) {
    console.error(`Brain Helper: Error in ${agentName} processing:`, error);
    throw new Error(`Failed to process ${agentName} request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build comprehensive prompt for agent processing
 */
function buildAgentPrompt(
  agentName: string,
  systemPrompt: string,
  userInput: string,
  context: ConversationContext
): string {
  const sections = [
    // Agent role and behavior
    `AGENT ROLE: ${agentName}`,
    systemPrompt,
    '',

    // Context information
    'CONTEXT:',
    buildContextSection(context),
    '',

    // Recent conversation history
    buildHistorySection(context),
    '',

    // User input
    'USER INPUT:',
    userInput,
    '',

    // Instructions
    'Please respond as the ' + agentName + ' agent, incorporating the provided context and maintaining consistency with your role.'
  ];

  return sections.join('\n');
}

/**
 * Build context section with location, tour state, and preferences
 */
function buildContextSection(context: ConversationContext): string {
  const contextParts = [];

  // User identification
  contextParts.push(`User ID: ${context.userId}`);

  // Location context
  if (context.location) {
    const { lat, lng, nearestMarkerId } = context.location;
    contextParts.push(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    if (nearestMarkerId) {
      contextParts.push(`Nearest marker: ${nearestMarkerId}`);
      contextParts.push('NOTE: There is a historical marker nearby. You MUST:');
      contextParts.push('1. Introduce it briefly and explain its significance');
      contextParts.push('2. End with this EXACT question: "Would you like the short version or the deeper story?"');
      contextParts.push('3. Focus on ONE marker only - do NOT list multiple markers by name');
    } else {
      contextParts.push('No historical markers nearby. Shift to regional context, nearby towns, parks, or landmarks.');
    }
  }

  // Tour state
  if (context.tourState) {
    const { currentMarkerId, nextMarkerId, mode } = context.tourState;
    contextParts.push(`Tour mode: ${mode || 'idle'}`);
    if (mode === 'drive') {
      contextParts.push('IMPORTANT: User is DRIVING. Keep responses concise. For visual content (maps, lists), start with "When it\'s safe to look at your screen..."');
    }
    if (currentMarkerId) contextParts.push(`Current marker: ${currentMarkerId}`);
    if (nextMarkerId) contextParts.push(`Next marker: ${nextMarkerId}`);
  }

  // User preferences
  if (context.preferences) {
    const { verbosity, tone } = context.preferences;
    if (verbosity === 'short') {
      contextParts.push('IMPORTANT: User prefers SHORT responses. Keep it concise and to the point.');
    } else if (verbosity === 'long') {
      contextParts.push('User prefers DETAILED responses. Provide more depth and context.');
    }
    contextParts.push(`Response style: ${verbosity || 'medium'} length, ${tone || 'conversational'} tone`);
  }

  // Engine tier
  contextParts.push(`Engine tier: ${context.engineTier || 'premium'}`);

  return contextParts.join('\n');
}

/**
 * Build conversation history section
 */
function buildHistorySection(context: ConversationContext, maxMessages: number = 5): string {
  const recentHistory = context.history.slice(-maxMessages);

  if (recentHistory.length === 0) {
    return 'RECENT CONVERSATION:\nNo previous conversation.';
  }

  const historyText = recentHistory
    .map(msg => {
      const timestamp = msg.timestamp ? ` (${msg.timestamp.toISOString()})` : '';
      return `${msg.role.toUpperCase()}${timestamp}: ${msg.content}`;
    })
    .join('\n');

  return `RECENT CONVERSATION:\n${historyText}`;
}

/**
 * Fallback function for when Premium brain is not available
 * Returns to Standard or Offline brain functionality
 */
export async function runStandardAgentPrompt(
  agentName: string,
  systemPrompt: string,
  userInput: string,
  context: ConversationContext
): Promise<string> {
  // TODO: Phase 5 - Implement Standard brain (Sesame AI) integration
  // For now, return a placeholder response
  console.warn(`Brain Helper: Standard brain not implemented yet for ${agentName}`);

  const brain = getBrainForEnvironment();
  return `[${agentName}] I'm currently running on the ${brain.name} but the Standard brain implementation is coming in Phase 5. User asked: "${userInput}"`;
}

/**
 * Fallback function for offline mode
 */
export async function runOfflineAgentPrompt(
  agentName: string,
  systemPrompt: string,
  userInput: string,
  context: ConversationContext
): Promise<string> {
  // TODO: Phase 6 - Implement offline brain integration
  console.warn(`Brain Helper: Offline brain not implemented yet for ${agentName}`);

  return `[${agentName}] I'm currently in offline mode but this functionality is coming in Phase 6. User asked: "${userInput}"`;
}

/**
 * Smart brain selection based on context and availability
 */
export async function runSmartAgentPrompt(
  agentName: string,
  systemPrompt: string,
  userInput: string,
  context: ConversationContext
): Promise<string> {
  const brain = getBrainForEnvironment();
  const engineTier = context.engineTier || brain.provider;

  switch (engineTier) {
    case 'premium':
      return await runPremiumAgentPrompt(agentName, systemPrompt, userInput, context);

    case 'standard':
      return await runStandardAgentPrompt(agentName, systemPrompt, userInput, context);

    case 'offline':
      return await runOfflineAgentPrompt(agentName, systemPrompt, userInput, context);

    default:
      // Default to premium if available, otherwise fall back
      try {
        return await runPremiumAgentPrompt(agentName, systemPrompt, userInput, context);
      } catch (error) {
        console.warn('Brain Helper: Premium brain failed, attempting fallback');
        return await runStandardAgentPrompt(agentName, systemPrompt, userInput, context);
      }
  }
}