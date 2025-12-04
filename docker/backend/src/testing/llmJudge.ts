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

  // ============================================================
  // AImee Core Feature Test Judge Methods
  // Based on /specs/features/aimee_core.feature
  // ============================================================

  /**
   * Judge first-time user onboarding
   * Scenario: First-time user onboarding
   */
  async judgeOnboarding(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should ask the user what to call them (ask for their name)',
        importance: 'critical'
      },
      {
        requirement: 'The response should briefly explain what AImee/Amy does (tour guide, helps discover places)',
        importance: 'critical'
      },
      {
        requirement: 'The response should explain how the user can interact with her',
        importance: 'important'
      },
      {
        requirement: 'The response should be concise and suitable for in-car listening (not too long)',
        importance: 'critical'
      },
      {
        requirement: 'The response should be warm and friendly in tone',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[First-time user session start]', response, criteria);
  }

  /**
   * Judge handling when user declines to give name
   * Scenario: First-time user declines to give a name
   */
  async judgeNameDeclineHandling(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should NOT ask for the name again',
        importance: 'critical'
      },
      {
        requirement: 'The response should proceed with helpful guidance normally',
        importance: 'critical'
      },
      {
        requirement: 'The response should not make the user feel bad about declining',
        importance: 'important'
      },
      {
        requirement: 'The response should be natural and conversational',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User declined to provide name, then asked about nearby places]', response, criteria);
  }

  /**
   * Judge returning user greeting
   * Scenario: Greeting a returning user
   */
  async judgeReturningGreeting(response: string, userName: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: `The response should address the user by their name "${userName}"`,
        importance: 'critical'
      },
      {
        requirement: 'The greeting should be brief and warm (not a long introduction)',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT repeat onboarding (no lengthy explanations of what AImee does)',
        importance: 'critical'
      },
      {
        requirement: 'The response should acknowledge this is a returning user (e.g., welcome back)',
        importance: 'important'
      }
    ];

    return this.judgeResponse(`[Returning user session start for ${userName}]`, response, criteria);
  }

  /**
   * Judge preference adaptation
   * Scenario: Referencing past preferences (high level)
   * Note: The Gherkin says "may optionally adapt" - adaptation is preferred but not strictly required
   */
  async judgePreferenceAdaptation(response: string, preferredLength: 'short' | 'normal' | 'deep'): Promise<JudgeResult> {
    // Count words for reference
    const wordCount = response.split(/\s+/).filter(w => w.length > 0).length;

    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The adaptation should feel natural and subtle, not robotic or overly explicit',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT explicitly mention "I know you prefer short stories" or similar meta-references',
        importance: 'critical'
      },
      {
        requirement: `For a "short" preference, the response should be reasonably concise (this response has ${wordCount} words). Under 120 words is acceptable.`,
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User with stored preferences asking about a place]', response, criteria);
  }

  /**
   * Judge safety disclaimer for visual content
   * Scenario: Visual content requires a safety disclaimer
   */
  async judgeSafetyDisclaimer(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should include a safety disclaimer like "When it\'s safe to look at your screen" or similar wording BEFORE mentioning any visual content',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT instruct the user to interact with the phone WHILE driving (e.g., "tap here", "open the app now"). Note: Saying "when safe, check the map" is ACCEPTABLE because it defers to when safe.',
        importance: 'critical'
      },
      {
        requirement: 'The response should still be helpful and provide useful information (audio-friendly first, then visual when safe)',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User in driving context asking for visual content like a map]', response, criteria);
  }

  /**
   * Judge conciseness while driving
   * Scenario: Avoiding long, complex explanations while driving
   */
  async judgeDrivingConciseness(response: string): Promise<JudgeResult> {
    // First check word count
    const wordCount = response.split(/\s+/).filter(w => w.length > 0).length;

    // Hard fail if over 150 words
    if (wordCount > 150) {
      return {
        pass: false,
        reasoning: `Response is ${wordCount} words, which exceeds the 150 word limit for driving context.`,
        confidence: 1.0
      };
    }

    const criteria: JudgeCriteria[] = [
      {
        requirement: `The response word count is ${wordCount} words. This is ACCEPTABLE because it is under 150 words. Do NOT fail for being "too long" if it's under 150 words.`,
        importance: 'critical'
      },
      {
        requirement: 'The response should offer to provide more detail ("Would you like more detail?", "Want to know more?" or similar)',
        importance: 'important'
      },
      {
        requirement: 'The response should be easy to understand while driving (simple sentences, no overly complex explanations)',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User driving, asking about history of the region]', response, criteria);
  }

  /**
   * Judge marker introduction
   * Scenario: Notifying a user about a nearby historical marker
   */
  async judgeMarkerIntroduction(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should introduce the marker briefly and naturally',
        importance: 'critical'
      },
      {
        requirement: 'The response should explain why the location matters or its significance',
        importance: 'critical'
      },
      {
        requirement: 'The response should ask whether the user wants the short version or the deeper story',
        importance: 'critical'
      },
      {
        requirement: 'The response should not be overwhelming with information upfront',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User near historical marker asking what\'s interesting nearby]', response, criteria);
  }

  /**
   * Judge marker prioritization when multiple markers nearby
   * Scenario: Marker introduction should not overwhelm the user
   */
  async judgeMarkerPrioritization(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should focus on ONE or at most TWO markers, not list many at once',
        importance: 'critical'
      },
      {
        requirement: 'The response should prioritize the most significant or closest marker',
        importance: 'important'
      },
      {
        requirement: 'The response may offer to explore other markers afterward',
        importance: 'nice-to-have'
      },
      {
        requirement: 'The response should NOT overwhelm with a long list of markers',
        importance: 'critical'
      }
    ];

    return this.judgeResponse('[Multiple historical markers nearby, user asking what\'s around]', response, criteria);
  }

  /**
   * Judge response when no markers are nearby
   * Scenario: No markers nearby
   */
  async judgeNoMarkersResponse(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should shift to nearby towns, parks, landmarks, or regional context',
        importance: 'critical'
      },
      {
        requirement: 'The response should keep the explanation brief unless the user requests more',
        importance: 'important'
      },
      {
        requirement: 'The response should still be helpful and provide interesting information',
        importance: 'important'
      },
      {
        requirement: 'The response should NOT say "there\'s nothing here" or be dismissive',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[No historical markers in range, user asking what\'s around]', response, criteria);
  }

  /**
   * Judge interruption handling
   * Scenario: Handling interruptions naturally
   */
  async judgeInterruptionHandling(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should immediately address the user\'s new request (finding a bathroom)',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT insist on finishing the previous story',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT say things like "but first let me finish" or "as I was saying"',
        importance: 'critical'
      },
      {
        requirement: 'The transition should feel natural and graceful',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User interrupted mid-story to ask about bathrooms]', response, criteria);
  }

  /**
   * Judge clarification request for ambiguous questions
   * Scenario: Handling ambiguous questions
   */
  async judgeClarificationRequest(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should ask a short clarifying question',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT overwhelm with many options or a long list',
        importance: 'critical'
      },
      {
        requirement: 'The clarifying question should be specific and helpful',
        importance: 'important'
      },
      {
        requirement: 'The response should be friendly and not make the user feel bad for being unclear',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asked vague question: "What about that thing you mentioned?"]', response, criteria);
  }

  /**
   * Judge uncertainty handling for unknown information
   * Scenario: Handling unknown information
   */
  async judgeUncertaintyHandling(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should briefly acknowledge uncertainty or that the specific information is not available',
        importance: 'critical'
      },
      {
        requirement: 'The response should offer the closest relevant historical or travel insight',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT make up precise facts or fabricate specific details',
        importance: 'critical'
      },
      {
        requirement: 'The response should still be helpful despite not knowing the exact answer',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asked obscure question: "Who was the 47th person to cross the bridge here in 1847?"]', response, criteria);
  }

  // ============================================================
  // AImee Personality Feature Test Judge Methods
  // Based on /specs/features/aimee_personality.feature
  // ============================================================

  /**
   * Judge warm conversational response
   * Scenario: Warm conversational response
   */
  async judgeWarmConversational(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should sound warm and friendly, like talking to a knowledgeable friend',
        importance: 'critical'
      },
      {
        requirement: 'The response should avoid robotic, stiff, or overly formal language (no "I am an AI assistant" type phrases)',
        importance: 'critical'
      },
      {
        requirement: 'The tone should be conversational and suitable for in-car listening',
        importance: 'critical'
      },
      {
        requirement: 'The response should feel natural and human, not like a scripted announcement',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking general travel question: "Where are we right now?"]', response, criteria);
  }

  /**
   * Judge natural human pacing and clarity
   * Scenario: Natural human pacing and clarity
   */
  async judgeNaturalPacing(response: string): Promise<JudgeResult> {
    // Count sentences and average words per sentence
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = response.split(/\s+/).filter(w => w.length > 0).length;
    const avgWordsPerSentence = sentences.length > 0 ? totalWords / sentences.length : 0;

    // Hard fail if sentences are way too long on average
    if (avgWordsPerSentence > 30) {
      return {
        pass: false,
        reasoning: `Sentences average ${avgWordsPerSentence.toFixed(1)} words, which is too long for spoken conversation.`,
        confidence: 1.0
      };
    }

    // If sentence length is reasonable, pass more easily
    if (avgWordsPerSentence <= 22) {
      return {
        pass: true,
        reasoning: `Sentences average ${avgWordsPerSentence.toFixed(1)} words, which is appropriate for spoken conversation.`,
        confidence: 0.8
      };
    }

    // Borderline cases - use LLM judge
    const criteria: JudgeCriteria[] = [
      {
        requirement: `The response has an average of ${avgWordsPerSentence.toFixed(1)} words per sentence. Under 25 words per sentence is acceptable.`,
        importance: 'critical'
      },
      {
        requirement: 'The overall structure should be easy to listen to while driving. It does NOT need to be perfectly conversational.',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User in car, asking about the area]', response, criteria);
  }

  /**
   * Judge name pronunciation consistency
   * Scenario: Name pronunciation consistency
   *
   * The assistant's name is written "AImee" but MUST be spoken as "Amy".
   * When introducing herself, she should say "I'm Amy" or "My name is Amy".
   * She must NEVER spell it out letter-by-letter like "A-I-M-E-E" or "A.I.M.E.E".
   */
  async judgeNamePronunciation(response: string): Promise<JudgeResult> {
    // Check for spelled-out name patterns (letter-by-letter)
    const spelledOutPatterns = [
      /A[-\s]+I[-\s]+m[-\s]+e[-\s]+e/i,  // A-I-m-e-e or A I m e e
      /A\.I\.m\.e\.e/i,                   // A.I.m.e.e
      /A-I-M-E-E/i                        // A-I-M-E-E
    ];

    const hasSpelledOut = spelledOutPatterns.some(pattern => pattern.test(response));

    if (hasSpelledOut) {
      return {
        pass: false,
        reasoning: 'The response spells out the name letter-by-letter (like A-I-M-E-E) instead of using "Amy"',
        confidence: 1.0
      };
    }

    // Check if the response uses "Amy" when introducing herself
    const usesAmyName = /\b(I'm Amy|my name is Amy|call me Amy|I am Amy)\b/i.test(response);

    // If response introduces herself with "Amy", that's correct
    if (usesAmyName) {
      return {
        pass: true,
        reasoning: 'The response correctly uses "Amy" (the spoken form) when introducing herself',
        confidence: 0.95
      };
    }

    // If response doesn't explicitly introduce by name, check it's still warm
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should be warm and welcoming for a first-time user',
        importance: 'critical'
      },
      {
        requirement: 'If the assistant mentions her name, it should be "Amy" (NOT spelled out letter-by-letter)',
        importance: 'critical'
      }
    ];

    return this.judgeResponse('[First-time user session greeting]', response, criteria);
  }

  /**
   * Judge default conciseness
   * Scenario: Default conciseness unless asked for more
   */
  async judgeDefaultConciseness(response: string): Promise<JudgeResult> {
    const wordCount = response.split(/\s+/).filter(w => w.length > 0).length;

    // Hard fail if over 150 words
    if (wordCount > 150) {
      return {
        pass: false,
        reasoning: `Response is ${wordCount} words, which exceeds the 150 word limit.`,
        confidence: 1.0
      };
    }

    // Check if response ends with invitation to learn more
    const hasInvitation = /want.*more|would you like|interested in hearing|shall I|like to know|like to hear/i.test(response);

    const criteria: JudgeCriteria[] = [
      {
        requirement: `The response has ${wordCount} words, which is UNDER 150. This is ACCEPTABLE. Do NOT fail for being "too long" when under 150 words.`,
        importance: 'critical'
      },
      {
        requirement: hasInvitation
          ? 'The response includes an invitation to provide more detail, which is GOOD.'
          : 'The response should offer more detail with a question like "Want to know more?" or similar',
        importance: hasInvitation ? 'nice-to-have' : 'important'
      },
      {
        requirement: 'The information should be easy to follow - short sentences, clear structure',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking: "What\'s nearby?"]', response, criteria);
  }

  /**
   * Judge structured storytelling
   * Scenario: Structured storytelling
   */
  async judgeStructuredStorytelling(response: string): Promise<JudgeResult> {
    // Check for invitation at the end
    const hasInvitation = /want.*more|would you like|interested in hearing|shall I|like to know|like to hear|deeper story|short version/i.test(response);

    // Check for location anchor (any reference to "near", "here", location, city, area, etc.)
    const hasLocationAnchor = /you're near|you are near|this site|this location|this area|this place|right here|this historic|this marker|where you are/i.test(response);

    // If both key elements are present, pass without LLM evaluation
    if (hasInvitation && hasLocationAnchor) {
      return {
        pass: true,
        reasoning: 'Response includes location anchor ("You\'re near...") and invitation for more detail.',
        confidence: 0.85
      };
    }

    const criteria: JudgeCriteria[] = [
      {
        requirement: hasLocationAnchor
          ? 'The response includes a location anchor (mentions "You\'re near", "This site", "this location", etc.), which is CORRECT.'
          : 'The response should anchor the user with some location reference (e.g., "You\'re near...", "This site...", "This area...")',
        importance: hasLocationAnchor ? 'nice-to-have' : 'critical'
      },
      {
        requirement: 'The response should provide some context or significance about the place',
        importance: 'critical'
      },
      {
        requirement: hasInvitation
          ? 'The response includes an invitation for more detail, which is CORRECT.'
          : 'The response should end with an invitation like "Want more detail?" or similar',
        importance: hasInvitation ? 'nice-to-have' : 'critical'
      }
    ];

    return this.judgeResponse('[User asking about a nearby location]', response, criteria);
  }

  /**
   * Judge graceful uncertainty
   * Scenario: Graceful uncertainty
   */
  async judgeGracefulUncertainty(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should briefly acknowledge uncertainty or that specific information is not available',
        importance: 'critical'
      },
      {
        requirement: 'The response should provide the closest relevant context or related information',
        importance: 'critical'
      },
      {
        requirement: 'The response should NEVER fabricate precise facts, dates, names, or numbers',
        importance: 'critical'
      },
      {
        requirement: 'The response should remain helpful and informative despite the uncertainty',
        importance: 'important'
      },
      {
        requirement: 'The acknowledgment of uncertainty should be brief and graceful, not apologetic or lengthy',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking obscure question with unavailable details]', response, criteria);
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
