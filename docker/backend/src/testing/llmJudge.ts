/**
 * LLM-as-Judge Module for AImee Response Quality Testing
 *
 * Uses a separate LLM call to evaluate whether responses meet quality criteria.
 * This provides flexible, semantic evaluation that can handle varied phrasing.
 */

import OpenAI from 'openai';

export interface JudgeResult {
  pass: boolean;
  reasoning: string;
  confidence: number;
}

export interface JudgeCriteria {
  requirement: string;
  importance: 'critical' | 'important' | 'nice-to-have';
}

/**
 * LLM Judge for evaluating response quality
 */
export class LLMJudge {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey?: string, model: string = 'gpt-4o-mini') {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    this.model = model;
  }

  /**
   * Generic response evaluation against criteria
   */
  async judgeResponse(
    prompt: string,
    response: string,
    criteria: JudgeCriteria[]
  ): Promise<JudgeResult> {
    const criteriaText = criteria
      .map((c, i) => `${i + 1}. [${c.importance.toUpperCase()}] ${c.requirement}`)
      .join('\n');

    const judgePrompt = `You are evaluating an AI assistant's response for quality.

USER PROMPT: "${prompt}"

AI RESPONSE: "${response}"

CRITERIA TO EVALUATE:
${criteriaText}

Evaluate whether the response meets ALL criteria. Consider:
- Does it address the user's needs?
- Is it appropriate in tone and content?
- Does it meet each specific criterion?

Respond in this exact JSON format:
{
  "pass": true/false,
  "reasoning": "Brief explanation of your evaluation",
  "confidence": 0.0-1.0
}

A response should PASS only if it meets all CRITICAL criteria and most IMPORTANT criteria.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: judgePrompt }],
        temperature: 0.1, // Low temperature for consistent evaluation
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0].message.content || '{}';
      const result = JSON.parse(content);

      return {
        pass: result.pass === true,
        reasoning: result.reasoning || 'No reasoning provided',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.5
      };
    } catch (error) {
      console.error('LLM Judge error:', error);
      return {
        pass: false,
        reasoning: `Judge evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      };
    }
  }

  /**
   * Specialized judge for greeting responses
   */
  async judgeGreeting(
    response: string,
    hasStoredName: boolean,
    userName?: string
  ): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The greeting should be warm and welcoming',
        importance: 'critical'
      }
    ];

    if (hasStoredName && userName) {
      // Returning user - no need to re-introduce, just welcome back
      criteria.push({
        requirement: `The greeting should address the user by their name "${userName}"`,
        importance: 'critical'
      });
      criteria.push({
        requirement: 'The greeting should acknowledge this is a returning user (e.g., "welcome back", "good to see you again")',
        importance: 'important'
      });
    } else {
      // First-time user - introduce self and ask for name
      criteria.push({
        requirement: 'The greeting should introduce the assistant as AImee or Amy',
        importance: 'important'
      });
      criteria.push({
        requirement: 'The greeting should ask for the user\'s name',
        importance: 'critical'
      });
    }

    const prompt = hasStoredName
      ? `[Returning user greeting for ${userName}]`
      : '[First-time user greeting]';

    return this.judgeResponse(prompt, response, criteria);
  }

  /**
   * Specialized judge for name capture responses
   */
  async judgeNameCapture(
    userInput: string,
    response: string
  ): Promise<JudgeResult> {
    // Extract the name from user input
    const nameMatch = userInput.match(/(?:my name is|call me|i'm|i am)\s+(\w+)/i);
    const providedName = nameMatch ? nameMatch[1] : 'the user';

    const criteria: JudgeCriteria[] = [
      {
        requirement: `The response should acknowledge the name "${providedName}"`,
        importance: 'critical'
      },
      {
        requirement: 'The response should use the name naturally in conversation',
        importance: 'important'
      },
      {
        requirement: 'The response should offer to help or continue the conversation',
        importance: 'important'
      },
      {
        requirement: 'The response should NOT ask for the name again',
        importance: 'critical'
      }
    ];

    return this.judgeResponse(userInput, response, criteria);
  }

  /**
   * Specialized judge for reconnection responses
   */
  async judgeReconnection(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should be brief (1-2 sentences)',
        importance: 'important'
      },
      {
        requirement: 'The response should acknowledge the reconnection or welcome back',
        importance: 'critical'
      },
      {
        requirement: 'The response should offer to help',
        importance: 'important'
      },
      {
        requirement: 'The response should NOT repeat a full introduction',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User reconnected after brief disconnection]', response, criteria);
  }

  /**
   * Simple assertion-based checks (no LLM call)
   * Use these for quick, deterministic validation
   */
  static assertContains(response: string, substring: string): boolean {
    return response.toLowerCase().includes(substring.toLowerCase());
  }

  static assertNotContains(response: string, substring: string): boolean {
    return !response.toLowerCase().includes(substring.toLowerCase());
  }

  static assertLengthBetween(response: string, min: number, max: number): boolean {
    return response.length >= min && response.length <= max;
  }

  static assertWordCountBetween(response: string, min: number, max: number): boolean {
    const wordCount = response.split(/\s+/).filter(w => w.length > 0).length;
    return wordCount >= min && wordCount <= max;
  }
}

// Export singleton for convenience
let defaultJudge: LLMJudge | null = null;

export function getJudge(): LLMJudge {
  if (!defaultJudge) {
    defaultJudge = new LLMJudge();
  }
  return defaultJudge;
}
