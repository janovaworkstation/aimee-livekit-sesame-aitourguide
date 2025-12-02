// AImee Multi-Agent Router
// Phase 9: Routes user input to the most appropriate agent using intent classification

import { Agent } from './baseAgent';
import { ConversationContext, AgentResult, IntentMatch, AgentPriority } from './types';
import { NavigatorAgent } from './navigatorAgent';
import { HistorianAgent } from './historianAgent';
import { ExperienceAgent } from './experienceAgent';
import { MemoryAgent } from './memoryAgent';
import { SimpleIntentRouter, IntentAnalysis } from '../brain/intentRouter';

/**
 * Result of agent routing decision
 */
export interface RoutingResult {
  selectedAgent: Agent;
  confidence: number;
  alternativeAgents: Array<{ agent: Agent; confidence: number }>;
  reasoning: string;
}

/**
 * Multi-agent router that determines the best agent to handle user input
 */
export class AgentRouter {
  private agents: Agent[];

  constructor() {
    // Initialize all available agents
    this.agents = [
      new NavigatorAgent(),
      new HistorianAgent(),
      new ExperienceAgent(),
      new MemoryAgent()
    ];

    console.log(`Agent Router: Initialized with ${this.agents.length} agents:`,
      this.agents.map(a => a.name).join(', '));
  }

  /**
   * Route user input to the most appropriate agent
   */
  async routeToAgent(input: string, context: ConversationContext): Promise<AgentResult> {
    try {
      console.log('Agent Router: Routing request:', input.substring(0, 100) + '...');

      // Find the best agent for this input
      const routingResult = this.selectAgent(input, context);

      console.log(`Agent Router: Selected ${routingResult.selectedAgent.name} agent (confidence: ${routingResult.confidence.toFixed(2)})`);
      console.log(`Agent Router: Reasoning: ${routingResult.reasoning}`);

      // Execute the selected agent
      const result = await routingResult.selectedAgent.run(input, context);

      // Add routing metadata to the result
      result.metadata = {
        ...result.metadata,
        routing: {
          selectedAgent: routingResult.selectedAgent.name,
          confidence: routingResult.confidence,
          reasoning: routingResult.reasoning,
          alternativeAgents: routingResult.alternativeAgents.map(alt => ({
            agent: alt.agent.name,
            confidence: alt.confidence
          }))
        }
      };

      return result;

    } catch (error) {
      console.error('Agent Router: Error during routing:', error);

      // Fallback to a generic response
      return {
        text: "I'm having trouble processing your request right now. Could you please try rephrasing your question?",
        metadata: {
          agent: 'Router',
          error: error instanceof Error ? error.message : 'Unknown error',
          confidence: 0
        }
      };
    }
  }

  /**
   * Select the most appropriate agent based on input and context
   */
  private selectAgent(input: string, context: ConversationContext): RoutingResult {
    // Phase 9: Use intent router for initial classification
    const intentAnalysis = SimpleIntentRouter.analyzeIntent(input);

    console.log(`Agent Router: Intent analysis - ${SimpleIntentRouter.getSummary(intentAnalysis)}`);

    const candidateAgents: Array<{ agent: Agent; confidence: number; match?: IntentMatch }> = [];

    // Map intent classifications to actual agent instances
    const primaryIntent = intentAnalysis.primaryIntent;
    const primaryAgent = this.agents.find(agent => agent.name === primaryIntent.agent);

    if (primaryAgent && primaryAgent.canHandle(input, context)) {
      candidateAgents.push({
        agent: primaryAgent,
        confidence: primaryIntent.confidence,
        match: {
          confidence: primaryIntent.confidence,
          keywords: primaryIntent.matchedKeywords,
          priority: AgentPriority.HIGH
        }
      });

      console.log(`Agent Router: ${primaryAgent.name} (PRIMARY INTENT) confidence: ${primaryIntent.confidence.toFixed(2)}`);
    }

    // Add alternative intents as candidates
    for (const altIntent of intentAnalysis.alternativeIntents) {
      if (altIntent.confidence > 0.2) { // Only consider alternatives with reasonable confidence
        const altAgent = this.agents.find(agent => agent.name === altIntent.agent);
        if (altAgent && altAgent.canHandle(input, context)) {
          candidateAgents.push({
            agent: altAgent,
            confidence: altIntent.confidence,
            match: {
              confidence: altIntent.confidence,
              keywords: altIntent.matchedKeywords,
              priority: AgentPriority.MEDIUM
            }
          });

          console.log(`Agent Router: ${altAgent.name} (ALTERNATIVE) confidence: ${altIntent.confidence.toFixed(2)}`);
        }
      }
    }

    // Fallback: If no intent-based matches, use original canHandle logic
    if (candidateAgents.length === 0) {
      console.log('Agent Router: No intent matches found, falling back to canHandle evaluation');

      for (const agent of this.agents) {
        if (agent.canHandle(input, context)) {
          let confidence = 0.3; // Lower confidence for fallback

          // Get detailed intent match if available
          const intentMatch = agent.getIntentMatch?.(input, context);
          if (intentMatch) {
            confidence = Math.max(confidence, intentMatch.confidence);
            candidateAgents.push({ agent, confidence, match: intentMatch });
          } else {
            candidateAgents.push({ agent, confidence });
          }

          console.log(`Agent Router: ${agent.name} (FALLBACK) can handle (confidence: ${confidence.toFixed(2)})`);
        }
      }
    }

    // Sort candidates by confidence (highest first)
    candidateAgents.sort((a, b) => b.confidence - a.confidence);

    // Apply tie-breaking rules and priority logic
    const finalSelection = this.applySelectionRules(candidateAgents, input, context);

    if (finalSelection.length === 0) {
      // No agents can handle - default to Experience agent for general helpfulness
      console.log('Agent Router: No agents matched, defaulting to Experience agent');
      const defaultAgent = this.agents.find(a => a.name === 'Experience')!;

      return {
        selectedAgent: defaultAgent,
        confidence: 0.1,
        alternativeAgents: [],
        reasoning: 'No specific agent matched; using Experience agent as fallback'
      };
    }

    const selected = finalSelection[0];
    const alternatives = finalSelection.slice(1);

    return {
      selectedAgent: selected.agent,
      confidence: selected.confidence,
      alternativeAgents: alternatives,
      reasoning: this.buildReasoningText(selected, alternatives, input)
    };
  }

  /**
   * Apply advanced selection rules and handle edge cases
   */
  private applySelectionRules(
    candidates: Array<{ agent: Agent; confidence: number; match?: IntentMatch }>,
    input: string,
    context: ConversationContext
  ): Array<{ agent: Agent; confidence: number; match?: IntentMatch }> {
    if (candidates.length === 0) return [];

    // Rule 1: Memory agent gets priority for clear preference/personal updates
    const memoryCandidate = candidates.find(c => c.agent.name === 'Memory');
    if (memoryCandidate && memoryCandidate.confidence > 0.8) {
      console.log('Agent Router: Memory agent has high confidence, prioritizing');
      return [memoryCandidate, ...candidates.filter(c => c.agent.name !== 'Memory')];
    }

    // Rule 2: Navigator gets priority when location context is strong and user asks location questions
    const navigatorCandidate = candidates.find(c => c.agent.name === 'Navigator');
    if (navigatorCandidate && context.location && navigatorCandidate.confidence > 0.7) {
      const locationQuestionPattern = /where|location|navigate|direction/i;
      if (locationQuestionPattern.test(input)) {
        console.log('Agent Router: Strong location context with navigation question, prioritizing Navigator');
        return [navigatorCandidate, ...candidates.filter(c => c.agent.name !== 'Navigator')];
      }
    }

    // Rule 3: Historian gets priority for clear information-seeking questions
    const historianCandidate = candidates.find(c => c.agent.name === 'Historian');
    if (historianCandidate && historianCandidate.confidence > 0.75) {
      const infoQuestionPattern = /^(what|who|when|how|why)\s/i;
      if (infoQuestionPattern.test(input.trim())) {
        console.log('Agent Router: Information question pattern detected, prioritizing Historian');
        return [historianCandidate, ...candidates.filter(c => c.agent.name !== 'Historian')];
      }
    }

    // Rule 4: Break ties by agent priority in ambiguous cases
    if (candidates.length > 1 && candidates[0].confidence - candidates[1].confidence < 0.1) {
      console.log('Agent Router: Close confidence scores, applying priority rules');

      const priorityOrder = ['Memory', 'Navigator', 'Historian', 'Experience'];
      candidates.sort((a, b) => {
        const priorityA = priorityOrder.indexOf(a.agent.name);
        const priorityB = priorityOrder.indexOf(b.agent.name);

        if (priorityA !== priorityB) {
          return priorityA - priorityB; // Lower index = higher priority
        }

        return b.confidence - a.confidence; // Fall back to confidence
      });
    }

    return candidates;
  }

  /**
   * Build human-readable reasoning for agent selection
   */
  private buildReasoningText(
    selected: { agent: Agent; confidence: number; match?: IntentMatch },
    alternatives: Array<{ agent: Agent; confidence: number; match?: IntentMatch }>,
    input: string
  ): string {
    const reasons = [];

    // Primary selection reason
    if (selected.confidence > 0.8) {
      reasons.push(`${selected.agent.name} had high confidence (${selected.confidence.toFixed(2)}) for this type of request`);
    } else if (selected.confidence > 0.6) {
      reasons.push(`${selected.agent.name} was a good match (${selected.confidence.toFixed(2)}) for this request`);
    } else {
      reasons.push(`${selected.agent.name} was the best available match (${selected.confidence.toFixed(2)})`);
    }

    // Add context about alternatives
    if (alternatives.length > 0) {
      const topAlternative = alternatives[0];
      if (selected.confidence - topAlternative.confidence < 0.2) {
        reasons.push(`${topAlternative.agent.name} was also considered (${topAlternative.confidence.toFixed(2)})`);
      }
    }

    // Add keywords if available
    if (selected.match?.keywords && selected.match.keywords.length > 0) {
      const keywordsText = selected.match.keywords.slice(0, 3).join(', ');
      reasons.push(`matched keywords: ${keywordsText}`);
    }

    return reasons.join('; ');
  }

  /**
   * Get information about all available agents
   */
  public getAvailableAgents(): Array<{ name: string; description: string }> {
    return this.agents.map(agent => ({
      name: agent.name,
      description: agent.description
    }));
  }

  /**
   * Test how different agents would handle a given input (for debugging)
   */
  public async testAllAgents(input: string, context: ConversationContext): Promise<any> {
    const results = [];

    for (const agent of this.agents) {
      const canHandle = agent.canHandle(input, context);
      const intentMatch = agent.getIntentMatch?.(input, context);

      results.push({
        agent: agent.name,
        canHandle,
        confidence: intentMatch?.confidence || (canHandle ? 0.5 : 0),
        keywords: intentMatch?.keywords || [],
        priority: intentMatch?.priority || AgentPriority.LOW
      });
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }
}

/**
 * Main routing function for external use
 */
export async function routeToAgent(input: string, context: ConversationContext): Promise<AgentResult> {
  const router = new AgentRouter();
  return await router.routeToAgent(input, context);
}