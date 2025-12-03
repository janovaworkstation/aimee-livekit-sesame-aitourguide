/**
 * Simple Rule-Based Intent Router for AImee Phase 9
 *
 * Analyzes user input to classify intent and route to appropriate agent.
 * Uses keyword matching and simple patterns to determine user intent.
 */

export interface IntentClassification {
  agent: 'Navigator' | 'Historian' | 'Experience' | 'Memory';
  confidence: number;
  matchedKeywords: string[];
  reasoning: string;
}

export interface IntentAnalysis {
  primaryIntent: IntentClassification;
  alternativeIntents: IntentClassification[];
  originalInput: string;
}

/**
 * Simple keyword-based intent classification
 */
export class SimpleIntentRouter {

  // Navigation-related keywords
  private static NAVIGATION_KEYWORDS = [
    'where', 'directions', 'navigate', 'route', 'next', 'go', 'travel',
    'location', 'position', 'find', 'way', 'how to get', 'drive', 'walk',
    'turn', 'distance', 'miles', 'close', 'nearby', 'around here'
  ];

  // History-related keywords
  private static HISTORY_KEYWORDS = [
    'history', 'story', 'built', 'about', 'when', 'who', 'what happened',
    'historical', 'past', 'old', 'ancient', 'founded', 'established',
    'century', 'years ago', 'originally', 'background', 'significance',
    'tell me about', 'explain', 'learn about'
  ];

  // Experience-related keywords
  private static EXPERIENCE_KEYWORDS = [
    'do', 'visit', 'recommend', 'activities', 'fun', 'enjoy', 'experience',
    'see', 'explore', 'attractions', 'things to', 'should I', 'worth',
    'popular', 'best', 'favorite', 'must see', 'check out', 'tourist',
    'sightseeing', 'entertainment', 'events'
  ];

  // Memory/preference-related keywords
  private static MEMORY_KEYWORDS = [
    'remember', 'preferences', 'settings', 'I like', 'prefer', 'favorite',
    'always', 'usually', 'my', 'personal', 'profile', 'save', 'keep',
    'note', 'remind', 'recall', 'previously', 'before', 'last time',
    'customize', 'adjust', 'my name is', 'call me', 'I am', 'name is'
  ];

  /**
   * Analyze user input and classify intent
   */
  public static analyzeIntent(input: string): IntentAnalysis {
    const normalizedInput = input.toLowerCase();
    const words = normalizedInput.split(/\s+/);

    // Calculate confidence scores for each agent type
    const navigatorScore = this.calculateScore(normalizedInput, words, this.NAVIGATION_KEYWORDS);
    const historianScore = this.calculateScore(normalizedInput, words, this.HISTORY_KEYWORDS);
    const experienceScore = this.calculateScore(normalizedInput, words, this.EXPERIENCE_KEYWORDS);
    const memoryScore = this.calculateScore(normalizedInput, words, this.MEMORY_KEYWORDS);

    // Create classification objects
    const classifications: IntentClassification[] = [
      {
        agent: 'Navigator',
        confidence: navigatorScore.confidence,
        matchedKeywords: navigatorScore.matches,
        reasoning: navigatorScore.reasoning
      },
      {
        agent: 'Historian',
        confidence: historianScore.confidence,
        matchedKeywords: historianScore.matches,
        reasoning: historianScore.reasoning
      },
      {
        agent: 'Experience',
        confidence: experienceScore.confidence,
        matchedKeywords: experienceScore.matches,
        reasoning: experienceScore.reasoning
      },
      {
        agent: 'Memory',
        confidence: memoryScore.confidence,
        matchedKeywords: memoryScore.matches,
        reasoning: memoryScore.reasoning
      }
    ];

    // Sort by confidence (highest first)
    classifications.sort((a, b) => b.confidence - a.confidence);

    // Apply additional pattern-based rules
    const adjustedClassifications = this.applyPatternRules(input, classifications);

    return {
      primaryIntent: adjustedClassifications[0],
      alternativeIntents: adjustedClassifications.slice(1),
      originalInput: input
    };
  }

  /**
   * Calculate confidence score for a set of keywords
   */
  private static calculateScore(
    input: string,
    words: string[],
    keywords: string[]
  ): { confidence: number; matches: string[]; reasoning: string } {
    const matches: string[] = [];
    let totalScore = 0;

    // Check for exact keyword matches
    for (const keyword of keywords) {
      if (input.includes(keyword.toLowerCase())) {
        matches.push(keyword);

        // Higher score for longer, more specific phrases
        const keywordLength = keyword.split(' ').length;
        totalScore += keywordLength * 0.3;

        // Bonus for exact word boundaries
        const wordBoundaryRegex = new RegExp(`\\b${keyword.toLowerCase()}\\b`);
        if (wordBoundaryRegex.test(input)) {
          totalScore += 0.2;
        }
      }
    }

    // Calculate confidence as percentage (0-1)
    const baseConfidence = Math.min(totalScore, 1.0);

    // Apply diminishing returns for too many matches (might indicate generic input)
    const adjustedConfidence = matches.length > 5
      ? baseConfidence * 0.8
      : baseConfidence;

    const reasoning = matches.length > 0
      ? `Matched ${matches.length} keywords: ${matches.slice(0, 3).join(', ')}`
      : 'No keyword matches found';

    return {
      confidence: Math.round(adjustedConfidence * 100) / 100, // Round to 2 decimals
      matches,
      reasoning
    };
  }

  /**
   * Apply additional pattern-based rules to improve classification
   */
  private static applyPatternRules(
    input: string,
    classifications: IntentClassification[]
  ): IntentClassification[] {
    const adjustedClassifications = [...classifications];
    const normalizedInput = input.toLowerCase().trim();

    // Question word patterns boost Historian confidence
    const questionWords = /^(what|who|when|how|why|tell me)\s/i;
    if (questionWords.test(normalizedInput)) {
      const historianIndex = adjustedClassifications.findIndex(c => c.agent === 'Historian');
      if (historianIndex !== -1) {
        adjustedClassifications[historianIndex].confidence += 0.2;
        adjustedClassifications[historianIndex].reasoning += '; Question pattern detected';
      }
    }

    // "Where" questions could be navigation or history
    const wherePattern = /^where\s/i;
    if (wherePattern.test(normalizedInput)) {
      const navigatorIndex = adjustedClassifications.findIndex(c => c.agent === 'Navigator');
      if (navigatorIndex !== -1) {
        adjustedClassifications[navigatorIndex].confidence += 0.15;
        adjustedClassifications[navigatorIndex].reasoning += '; "Where" question detected';
      }
    }

    // Personal pronouns boost Memory confidence
    const personalPronouns = /\b(i|my|me|mine|myself)\b/i;
    if (personalPronouns.test(normalizedInput)) {
      const memoryIndex = adjustedClassifications.findIndex(c => c.agent === 'Memory');
      if (memoryIndex !== -1) {
        adjustedClassifications[memoryIndex].confidence += 0.15;
        adjustedClassifications[memoryIndex].reasoning += '; Personal reference detected';
      }
    }

    // Name introductions strongly boost Memory confidence
    const nameIntroduction = /\b(my name is|call me|i am|i'm)\s+\w+/i;
    if (nameIntroduction.test(normalizedInput)) {
      const memoryIndex = adjustedClassifications.findIndex(c => c.agent === 'Memory');
      if (memoryIndex !== -1) {
        adjustedClassifications[memoryIndex].confidence += 0.5;
        adjustedClassifications[memoryIndex].reasoning += '; Name introduction detected';
      }
    }

    // Recommendation requests boost Experience confidence
    const recommendationPattern = /(recommend|suggest|should i|what.*do)/i;
    if (recommendationPattern.test(normalizedInput)) {
      const experienceIndex = adjustedClassifications.findIndex(c => c.agent === 'Experience');
      if (experienceIndex !== -1) {
        adjustedClassifications[experienceIndex].confidence += 0.2;
        adjustedClassifications[experienceIndex].reasoning += '; Recommendation pattern detected';
      }
    }

    // Re-sort after adjustments
    adjustedClassifications.sort((a, b) => b.confidence - a.confidence);

    // Ensure confidence values are still in valid range
    adjustedClassifications.forEach(classification => {
      classification.confidence = Math.min(classification.confidence, 1.0);
    });

    return adjustedClassifications;
  }

  /**
   * Get a human-readable summary of intent analysis
   */
  public static getSummary(analysis: IntentAnalysis): string {
    const primary = analysis.primaryIntent;
    const confidence = (primary.confidence * 100).toFixed(0);

    let summary = `Primary intent: ${primary.agent} (${confidence}% confidence)`;

    if (primary.matchedKeywords.length > 0) {
      summary += ` - Keywords: ${primary.matchedKeywords.slice(0, 3).join(', ')}`;
    }

    if (analysis.alternativeIntents.length > 0 && analysis.alternativeIntents[0].confidence > 0.3) {
      const alt = analysis.alternativeIntents[0];
      const altConfidence = (alt.confidence * 100).toFixed(0);
      summary += ` | Alternative: ${alt.agent} (${altConfidence}%)`;
    }

    return summary;
  }

  /**
   * Check if confidence is high enough to route with certainty
   */
  public static isHighConfidence(analysis: IntentAnalysis): boolean {
    return analysis.primaryIntent.confidence >= 0.6;
  }

  /**
   * Check if there's ambiguity between top two intents
   */
  public static isAmbiguous(analysis: IntentAnalysis): boolean {
    if (analysis.alternativeIntents.length === 0) return false;

    const primaryConfidence = analysis.primaryIntent.confidence;
    const secondaryConfidence = analysis.alternativeIntents[0].confidence;

    return (primaryConfidence - secondaryConfidence) < 0.2;
  }
}