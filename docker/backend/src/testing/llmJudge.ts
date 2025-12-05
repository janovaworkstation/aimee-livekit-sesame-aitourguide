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
        requirement: 'The response should ask ONE short clarifying question, not guess',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT provide multiple options or a long explanation',
        importance: 'critical'
      },
      {
        requirement: 'The clarifying question should be specific and easy to answer',
        importance: 'important'
      },
      {
        requirement: 'The response should indicate AImee will continue after clarification',
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

  // ============================================================
  // NEW CORE FEATURE JUDGE METHODS
  // Based on updated /specs/features/aimee_core.feature
  // ============================================================

  /**
   * Judge proactive marker introduction
   * Scenario: Proactive marker introduction on proximity
   */
  async judgeProactiveMarkerIntroduction(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should be brief and safe for driving context',
        importance: 'critical'
      },
      {
        requirement: 'The response should end with the exact phrase "Would you like the short version or the deeper story?"',
        importance: 'critical'
      },
      {
        requirement: 'The response should introduce a marker without overwhelming detail',
        importance: 'critical'
      },
      {
        requirement: 'The response should be naturally conversational, not abrupt or robotic',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User driving near historical marker, AImee proactively introduces it]', response, criteria);
  }

  /**
   * Judge route change request handling
   * Scenario: Asking before route changes
   */
  async judgeRouteChangeRequest(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response must clearly ask for user confirmation before making route changes',
        importance: 'critical'
      },
      {
        requirement: 'The response should explain the suggested change briefly',
        importance: 'important'
      },
      {
        requirement: 'The response should NOT make route changes without explicit approval',
        importance: 'critical'
      },
      {
        requirement: 'The request for confirmation should be clear and easy to understand',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[AImee suggesting a detour or new stop]', response, criteria);
  }

  /**
   * Judge forbidden action handling
   * Scenario: Forbidden irreversible actions
   */
  async judgeForbiddenActions(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response must clearly decline to perform the irreversible action',
        importance: 'critical'
      },
      {
        requirement: 'The response should briefly explain why AImee cannot perform this action',
        importance: 'critical'
      },
      {
        requirement: 'The response should offer a safe alternative if appropriate',
        importance: 'important'
      },
      {
        requirement: 'The decline should be polite and helpful, not dismissive',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking AImee to make booking, purchase, or irreversible action]', response, criteria);
  }

  /**
   * Judge driving safety compliance
   * Scenario: Short, safe responses while driving
   */
  async judgeDrivingSafety(response: string): Promise<JudgeResult> {
    const wordCount = response.split(/\s+/).filter(w => w.length > 0).length;

    // Hard fail if over 150 words
    if (wordCount > 150) {
      return {
        pass: false,
        reasoning: `Response is ${wordCount} words, exceeding the 150 word limit for driving safety.`,
        confidence: 1.0
      };
    }

    const criteria: JudgeCriteria[] = [
      {
        requirement: `The response has ${wordCount} words, which is under the 150 word limit for driving safety`,
        importance: 'critical'
      },
      {
        requirement: 'The sentences should be short and clear for audio listening',
        importance: 'critical'
      },
      {
        requirement: 'The response should be structured for easy audio comprehension',
        importance: 'important'
      },
      {
        requirement: 'If offering more detail, should be through a brief invitation only',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking question while driving]', response, criteria);
  }

  /**
   * Judge screen content safety
   * Scenario: Screen-related content safety
   */
  async judgeScreenContentSafety(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'If referencing visual content, must begin with "When it is safe to look at your screen..."',
        importance: 'critical'
      },
      {
        requirement: 'Should provide verbal summary before referencing visual elements',
        importance: 'critical'
      },
      {
        requirement: 'Should never instruct user to look at screen while driving',
        importance: 'critical'
      },
      {
        requirement: 'The safety disclaimer should be natural, not robotic',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[Response includes visual content while user is driving]', response, criteria);
  }

  /**
   * Judge single clarifying question handling
   * Scenario: Handling ambiguous questions with one clarifying question
   */
  async judgeAmbiguousClarification(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response must ask ONE short clarifying question, not guess',
        importance: 'critical'
      },
      {
        requirement: 'The response should NOT provide multiple options or long explanations',
        importance: 'critical'
      },
      {
        requirement: 'The clarifying question should be specific and easy to answer',
        importance: 'important'
      },
      {
        requirement: 'The response should indicate AImee will continue after clarification',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asked vague or ambiguous question]', response, criteria);
  }

  /**
   * Judge GPS unavailable fallback
   * Scenario: Fallback when GPS is unavailable
   */
  async judgeGPSFallback(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response must briefly acknowledge the GPS/location issue',
        importance: 'critical'
      },
      {
        requirement: 'The response should operate in Q&A mode only',
        importance: 'critical'
      },
      {
        requirement: 'The response must NOT attempt to describe nearby markers or locations',
        importance: 'critical'
      },
      {
        requirement: 'The acknowledgment should be brief and not overly technical',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[GPS data unavailable, user asking location-based question]', response, criteria);
  }

  /**
   * Judge tool failure handling
   * Scenario: Handling repeated tool failures
   */
  async judgeToolFailureHandling(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'The response should briefly explain the technical issue to the user',
        importance: 'critical'
      },
      {
        requirement: 'The response should indicate that AImee has stopped retrying the failed tool',
        importance: 'critical'
      },
      {
        requirement: 'The response should offer a simple alternative if one exists',
        importance: 'important'
      },
      {
        requirement: 'The explanation should be user-friendly, not technical jargon',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[Tool has failed multiple times, user waiting for response]', response, criteria);
  }

  // ============================================================
  // NEW PERSONALITY FEATURE JUDGE METHODS
  // Based on updated /specs/features/aimee_personality.feature
  // ============================================================


  /**
   * Judge required invitation after each answer
   * Scenario: Required invitation after each answer
   */
  async judgeRequiredInvitation(response: string): Promise<JudgeResult> {
    // Check for various invitation patterns
    const invitationPatterns = [
      /want.*more/i,
      /would you like/i,
      /interested in/i,
      /shall I/i,
      /like to know/i,
      /like to hear/i,
      /want.*detail/i,
      /more.*story/i,
      /another.*story/i,
      /tell you more/i
    ];

    const hasInvitation = invitationPatterns.some(pattern => pattern.test(response));

    if (!hasInvitation) {
      return {
        pass: false,
        reasoning: 'Response does not end with any recognizable invitation pattern. All responses must end with a natural invitation.',
        confidence: 1.0
      };
    }

    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Response ends with a natural invitation for more information',
        importance: 'critical'
      },
      {
        requirement: 'The invitation should match the tone and context of the conversation',
        importance: 'critical'
      },
      {
        requirement: 'The invitation should be brief and natural, not forced',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking any question, checking for mandatory invitation]', response, criteria);
  }

  /**
   * Judge enhanced structured storytelling rules
   * Scenario: Structured storytelling rules
   */
  async judgeEnhancedStructuredStorytelling(response: string, isFirstMarkerIntroduction: boolean = false): Promise<JudgeResult> {
    // Check for exact required phrase if it's a first marker introduction
    if (isFirstMarkerIntroduction) {
      const hasExactPhrase = response.includes('Would you like the short version or the deeper story?');
      if (!hasExactPhrase) {
        return {
          pass: false,
          reasoning: 'First-time marker introduction must end with the exact phrase: "Would you like the short version or the deeper story?"',
          confidence: 1.0
        };
      }
    }

    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Response includes a location anchor (where we are)',
        importance: 'critical'
      },
      {
        requirement: 'Response explains why this location matters or its significance',
        importance: 'critical'
      },
      {
        requirement: 'Response provides one interesting fact about the location',
        importance: 'critical'
      },
      {
        requirement: isFirstMarkerIntroduction
          ? 'Ends with exact phrase: "Would you like the short version or the deeper story?"'
          : 'Ends with an appropriate invitation',
        importance: 'critical'
      },
      {
        requirement: 'The storytelling structure flows naturally and conversationally',
        importance: 'important'
      }
    ];

    const context = isFirstMarkerIntroduction
      ? '[First-time introduction of nearby historical marker]'
      : '[AImee explaining historical marker or location]';

    return this.judgeResponse(context, response, criteria);
  }

  /**
   * Judge domain boundary enforcement
   * Scenario: Staying within domain unless user requests otherwise
   */
  async judgeDomainBoundaries(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Response gives a short, safe acknowledgment of the off-topic question',
        importance: 'critical'
      },
      {
        requirement: 'Response gently redirects toward travel, geography, or exploration topics',
        importance: 'critical'
      },
      {
        requirement: 'Response avoids acting as a general-purpose assistant',
        importance: 'critical'
      },
      {
        requirement: 'The redirect should be helpful and natural, not dismissive',
        importance: 'important'
      },
      {
        requirement: 'Response maintains AImee\'s warm, travel-focused personality',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User driving, asking non-travel question like weather, sports, etc.]', response, criteria);
  }

  /**
   * Judge graceful uncertainty with invitation
   * Scenario: Graceful uncertainty (updated with invitation requirement)
   */
  async judgeGracefulUncertaintyWithInvitation(response: string): Promise<JudgeResult> {
    // Check for invitation
    const hasInvitation = /want.*more|would you like|interested in|shall I|like to know|want.*detail/i.test(response);

    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Response briefly acknowledges uncertainty or that specific information is not available',
        importance: 'critical'
      },
      {
        requirement: 'Response provides the closest relevant contextual information',
        importance: 'critical'
      },
      {
        requirement: 'Response never fabricates precise facts, dates, names, or numbers',
        importance: 'critical'
      },
      {
        requirement: hasInvitation
          ? 'Ends with natural invitation like "Want more detail?" (GOOD)'
          : 'Must end with natural invitation such as "Want more detail?"',
        importance: hasInvitation ? 'nice-to-have' : 'critical'
      },
      {
        requirement: 'The acknowledgment of uncertainty is brief and graceful, not apologetic',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking for obscure or unavailable information]', response, criteria);
  }

  // ============================================================
  // MEMORY FEATURE JUDGE METHODS
  // Based on /specs/features/aimee_memory.feature
  // ============================================================

  /**
   * Judge name storage on first session
   * Scenario: Storing user name on first session
   */
  async judgeNameStorage(response: string, userName: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: `Should acknowledge and use the name "${userName}" provided by the user`,
        importance: 'critical'
      },
      {
        requirement: 'Should indicate the name will be stored/remembered for future sessions',
        importance: 'critical'
      },
      {
        requirement: `Should use "${userName}" when addressing the user in this session`,
        importance: 'important'
      },
      {
        requirement: 'Should be warm and friendly when receiving the name',
        importance: 'important'
      }
    ];

    return this.judgeResponse(`[User provided name "${userName}" after being asked "What should I call you?"]`, response, criteria);
  }

  /**
   * Judge returning user greeting by name
   * Scenario: Greeting returning user by name
   */
  async judgeReturningUserGreeting(response: string, storedName: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: `Should greet the user by their stored name "${storedName}"`,
        importance: 'critical'
      },
      {
        requirement: 'Should not repeat first-time onboarding explanation or ask "What should I call you?"',
        importance: 'critical'
      },
      {
        requirement: 'Should be warm and welcoming, indicating recognition of returning user',
        importance: 'important'
      },
      {
        requirement: 'Should be brief and not overwhelming since this is a reconnection',
        importance: 'important'
      }
    ];

    return this.judgeResponse(`[Returning user with stored name "${storedName}" starting new session]`, response, criteria);
  }

  /**
   * Judge respect for user refusal to share name
   * Scenario: Respecting user refusal to share a name
   */
  async judgeNameRefusalRespect(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should accept the refusal gracefully without pressure or repeated asking',
        importance: 'critical'
      },
      {
        requirement: 'Should not ask for the name again after user declined',
        importance: 'critical'
      },
      {
        requirement: 'Should continue conversation normally without using any assumed name',
        importance: 'critical'
      },
      {
        requirement: 'Should maintain warm, friendly tone despite not getting a name',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User declined to provide name when asked "What should I call you?"]', response, criteria);
  }

  /**
   * Judge trip memory usage within session
   * Scenario: Using trip memory within a session
   */
  async judgeTripMemoryUsage(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should reference the two-hour time constraint mentioned earlier in the session',
        importance: 'critical'
      },
      {
        requirement: 'Should suggest options that respect the time limit (quick visits, nearby locations)',
        importance: 'critical'
      },
      {
        requirement: 'Should demonstrate memory of trip-specific context from earlier in session',
        importance: 'important'
      },
      {
        requirement: 'Should not suggest time-consuming activities that exceed the constraint',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User earlier said "We only have about two hours today", now asking "What else can we see today?"]', response, criteria);
  }

  /**
   * Judge trip memory clearing between trips
   * Scenario: Clearing trip memory between trips
   */
  async judgeTripMemoryClearing(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should not assume previous route or stops are still active',
        importance: 'critical'
      },
      {
        requirement: 'Should ask about or infer the new trip context instead of using old trip data',
        importance: 'critical'
      },
      {
        requirement: 'Should treat this as a fresh trip rather than continuation of previous trip',
        importance: 'important'
      },
      {
        requirement: 'Should be helpful in establishing new trip context',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User starting new trip in different region after completing previous trip earlier today]', response, criteria);
  }

  /**
   * Judge long-term preference preservation
   * Scenario: Preserving long-term preferences across trips
   */
  async judgeLongTermPreferences(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should gently bias suggestions toward scenic overlooks based on stored preferences',
        importance: 'critical'
      },
      {
        requirement: 'Should demonstrate memory of user preferences across different trips',
        importance: 'important'
      },
      {
        requirement: 'Should present as preference-based suggestions, not absolute rules',
        importance: 'important'
      },
      {
        requirement: 'Should indicate willingness to respect any explicit request user might give',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User with stored preference for scenic overlooks over museums asking "What should we see around here?" on new trip]', response, criteria);
  }

  /**
   * Judge marker visit logging
   * Scenario: Logging a visited marker after departure
   */
  async judgeMarkerLogging(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should acknowledge or indicate that "Old Depot" visit has been recorded/logged',
        importance: 'critical'
      },
      {
        requirement: 'Should demonstrate understanding that the visit is now part of user history',
        importance: 'important'
      },
      {
        requirement: 'Should be brief since this is an internal process notification',
        importance: 'important'
      },
      {
        requirement: 'Should maintain conversational tone while confirming the logging',
        importance: 'nice-to-have'
      }
    ];

    return this.judgeResponse('[User stopped at "Old Depot" marker and has now departed, processing the visit for logging]', response, criteria);
  }

  /**
   * Judge repeat suggestion avoidance
   * Scenario: Avoiding repeat suggestions for recent visits
   */
  async judgeRepeatSuggestionAvoidance(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should not promote "Old Depot" as a primary new suggestion to visit',
        importance: 'critical'
      },
      {
        requirement: 'Should suggest other nearby options instead of already-visited location',
        importance: 'critical'
      },
      {
        requirement: 'May mention "Old Depot" only as a place already visited, not as a new recommendation',
        importance: 'important'
      },
      {
        requirement: 'Should demonstrate memory of what user has already seen',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User near "Old Depot" which they already visited, asking "What should we see nearby?"]', response, criteria);
  }

  /**
   * Judge visit history honesty
   * Scenario: Never inventing visit history
   */
  async judgeVisitHistoryHonesty(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Must not claim user has visited "Old Depot" when no record exists',
        importance: 'critical'
      },
      {
        requirement: 'Should clearly state there is no record of visiting this location',
        importance: 'critical'
      },
      {
        requirement: 'Should be honest about limitations of memory/records',
        importance: 'important'
      },
      {
        requirement: 'Should never fabricate or guess about visit history',
        importance: 'critical'
      }
    ];

    return this.judgeResponse('[User asking "Have we been here before?" about "Old Depot" with no visit record stored]', response, criteria);
  }

  /**
   * Judge preference learning from choices
   * Scenario: Learning preferences from repeated choices
   */
  async judgePreferenceLearning(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should suggest route emphasizing small towns and back roads based on learned preferences',
        importance: 'critical'
      },
      {
        requirement: 'Should present this as a preference-based suggestion, not a rigid rule',
        importance: 'critical'
      },
      {
        requirement: 'Should demonstrate learning from user\'s repeated choices over time',
        importance: 'important'
      },
      {
        requirement: 'Should indicate flexibility if user wants something different',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User with learned preference for small towns and back roads asking "What kind of route would you suggest today?"]', response, criteria);
  }

  /**
   * Judge explicit command override
   * Scenario: Personalization must not override explicit commands
   */
  async judgeExplicitOverride(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Must prioritize speed over scenic preferences as explicitly requested',
        importance: 'critical'
      },
      {
        requirement: 'Must not argue with or try to override the explicit user request',
        importance: 'critical'
      },
      {
        requirement: 'Should provide the fastest route to interstate as requested',
        importance: 'critical'
      },
      {
        requirement: 'Should acknowledge the request without resistance',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User with scenic route preference explicitly requesting "Take us the fastest way to the interstate"]', response, criteria);
  }

  /**
   * Judge privacy mode activation
   * Scenario: Enabling privacy or no-memory mode
   */
  async judgePrivacyModeActivation(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should confirm that long-term memory will not be updated',
        importance: 'critical'
      },
      {
        requirement: 'Should explain that only trip memory will be used for functionality',
        importance: 'critical'
      },
      {
        requirement: 'Should acknowledge user\'s privacy concerns respectfully',
        importance: 'important'
      },
      {
        requirement: 'Should be clear about what will and will not be remembered',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User concerned about data storage saying "Do not remember anything I say today"]', response, criteria);
  }

  /**
   * Judge privacy mode behavior
   * Scenario: Behavior while privacy mode is active
   */
  async judgePrivacyModeBehavior(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should acknowledge lighthouse preference for current session only',
        importance: 'important'
      },
      {
        requirement: 'Should not indicate this preference will be stored for future use',
        importance: 'critical'
      },
      {
        requirement: 'Should respect privacy mode by limiting memory storage',
        importance: 'critical'
      },
      {
        requirement: 'Should continue providing helpful service within privacy constraints',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[Privacy mode active, user sharing "We love lighthouses" preference]', response, criteria);
  }

  /**
   * Judge privacy mode disabling
   * Scenario: Disabling privacy or no-memory mode
   */
  async judgePrivacyModeDisabling(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should confirm that long-term memory is now re-enabled',
        importance: 'critical'
      },
      {
        requirement: 'Should indicate resumption of preference and history updates',
        importance: 'critical'
      },
      {
        requirement: 'Should acknowledge user\'s comfort with memory storage',
        importance: 'important'
      },
      {
        requirement: 'Should be clear about what will now be remembered going forward',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[Privacy mode previously active, user saying "It is fine to remember my trips again"]', response, criteria);
  }

  /**
   * Judge missing memory acknowledgment
   * Scenario: Acknowledging missing memory gracefully
   */
  async judgeMissingMemoryGrace(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should clearly state that the exact stop is not recorded in memory',
        importance: 'critical'
      },
      {
        requirement: 'Should not pretend to recall details that are not stored',
        importance: 'critical'
      },
      {
        requirement: 'Should offer to help rebuild memory from user description',
        importance: 'important'
      },
      {
        requirement: 'Should be graceful and helpful despite missing information',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking "Do you remember where we stopped last weekend?" with no stored record]', response, criteria);
  }

  /**
   * Judge personalization confidence
   * Scenario: Avoiding overconfident personalization
   */
  async judgePersonalizationConfidence(response: string): Promise<JudgeResult> {
    const criteria: JudgeCriteria[] = [
      {
        requirement: 'Should frame preferences as observations rather than absolute facts',
        importance: 'critical'
      },
      {
        requirement: 'Should avoid strong claims not clearly supported by stored memory',
        importance: 'critical'
      },
      {
        requirement: 'Should acknowledge uncertainty or limitations in preference data',
        importance: 'important'
      },
      {
        requirement: 'Should invite user input to clarify or correct preferences',
        importance: 'important'
      }
    ];

    return this.judgeResponse('[User asking "What do you think we like best?" with partial/incomplete preference data]', response, criteria);
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
