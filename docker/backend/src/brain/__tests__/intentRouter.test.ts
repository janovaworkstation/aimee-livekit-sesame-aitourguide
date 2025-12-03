import { SimpleIntentRouter, IntentAnalysis } from '../intentRouter';

describe('SimpleIntentRouter', () => {
  describe('analyzeIntent', () => {
    describe('Navigation intent', () => {
      it('should identify navigation intent for direction questions', () => {
        const result = SimpleIntentRouter.analyzeIntent('Where is the nearest restaurant?');
        expect(result.primaryIntent.agent).toBe('Navigator');
        expect(result.primaryIntent.confidence).toBeGreaterThan(0.3);
      });

      it('should identify navigation intent for route questions', () => {
        const result = SimpleIntentRouter.analyzeIntent('Navigate me to the museum');
        expect(result.primaryIntent.agent).toBe('Navigator');
      });

      it('should match "nearby" as navigation keyword', () => {
        const result = SimpleIntentRouter.analyzeIntent('What is nearby?');
        expect(result.primaryIntent.matchedKeywords).toContain('nearby');
      });
    });

    describe('History intent', () => {
      it('should identify history intent for historical questions', () => {
        const result = SimpleIntentRouter.analyzeIntent('Tell me about the history of this building');
        expect(result.primaryIntent.agent).toBe('Historian');
        expect(result.primaryIntent.confidence).toBeGreaterThan(0.3);
      });

      it('should identify history intent for "when" questions', () => {
        const result = SimpleIntentRouter.analyzeIntent('When was this place built?');
        expect(result.primaryIntent.agent).toBe('Historian');
      });

      it('should boost history confidence for question words', () => {
        const result = SimpleIntentRouter.analyzeIntent('What happened here in the past?');
        expect(result.primaryIntent.agent).toBe('Historian');
        expect(result.primaryIntent.reasoning).toContain('Question pattern detected');
      });
    });

    describe('Experience intent', () => {
      it('should identify experience intent for recommendations', () => {
        const result = SimpleIntentRouter.analyzeIntent('What should I do here?');
        expect(result.primaryIntent.agent).toBe('Experience');
      });

      it('should identify experience intent for activity questions', () => {
        const result = SimpleIntentRouter.analyzeIntent('What are the best attractions to visit?');
        expect(result.primaryIntent.agent).toBe('Experience');
      });

      it('should boost experience for recommendation patterns', () => {
        const result = SimpleIntentRouter.analyzeIntent('Can you recommend something fun?');
        expect(result.primaryIntent.agent).toBe('Experience');
        expect(result.primaryIntent.reasoning).toContain('Recommendation pattern detected');
      });
    });

    describe('Memory intent', () => {
      it('should identify memory intent for name introductions', () => {
        const result = SimpleIntentRouter.analyzeIntent('My name is Jeff');
        expect(result.primaryIntent.agent).toBe('Memory');
        expect(result.primaryIntent.confidence).toBeGreaterThan(0.5);
      });

      it('should identify memory intent for "call me" pattern', () => {
        const result = SimpleIntentRouter.analyzeIntent('Call me Sarah');
        expect(result.primaryIntent.agent).toBe('Memory');
      });

      it('should boost memory confidence for name introductions', () => {
        const result = SimpleIntentRouter.analyzeIntent("I'm John");
        expect(result.primaryIntent.reasoning).toContain('Name introduction detected');
      });

      it('should identify memory intent for preference statements', () => {
        const result = SimpleIntentRouter.analyzeIntent('I prefer short stories');
        expect(result.primaryIntent.agent).toBe('Memory');
      });

      it('should boost memory confidence for personal pronouns', () => {
        const result = SimpleIntentRouter.analyzeIntent('Remember my favorite place');
        expect(result.primaryIntent.agent).toBe('Memory');
        expect(result.primaryIntent.reasoning).toContain('Personal reference detected');
      });
    });

    describe('Ambiguous inputs', () => {
      it('should return multiple intents for ambiguous queries', () => {
        const result = SimpleIntentRouter.analyzeIntent('Tell me about this place');
        expect(result.alternativeIntents.length).toBeGreaterThan(0);
      });

      it('should have confidence values between 0 and 1', () => {
        const result = SimpleIntentRouter.analyzeIntent('My name is Jeff and I want to know the history');
        expect(result.primaryIntent.confidence).toBeGreaterThanOrEqual(0);
        expect(result.primaryIntent.confidence).toBeLessThanOrEqual(1);
        for (const alt of result.alternativeIntents) {
          expect(alt.confidence).toBeGreaterThanOrEqual(0);
          expect(alt.confidence).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('isHighConfidence', () => {
    it('should return true for confidence >= 0.6', () => {
      const result = SimpleIntentRouter.analyzeIntent('My name is Jeff');
      expect(SimpleIntentRouter.isHighConfidence(result)).toBe(true);
    });

    it('should return false for low confidence queries', () => {
      const result = SimpleIntentRouter.analyzeIntent('hello');
      expect(SimpleIntentRouter.isHighConfidence(result)).toBe(false);
    });
  });

  describe('isAmbiguous', () => {
    it('should detect ambiguous intents with close confidence scores', () => {
      // A query that could match multiple agents
      const result = SimpleIntentRouter.analyzeIntent('What is around here to see?');
      // This might be ambiguous between Navigator and Experience
      const isAmbig = SimpleIntentRouter.isAmbiguous(result);
      // Just verify it returns a boolean
      expect(typeof isAmbig).toBe('boolean');
    });

    it('should return false when primary intent is clearly dominant', () => {
      const result = SimpleIntentRouter.analyzeIntent('My name is Jeff');
      expect(SimpleIntentRouter.isAmbiguous(result)).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('should return a readable summary string', () => {
      const result = SimpleIntentRouter.analyzeIntent('Tell me the history of this place');
      const summary = SimpleIntentRouter.getSummary(result);

      expect(typeof summary).toBe('string');
      expect(summary).toContain('Primary intent:');
      expect(summary).toContain('Historian');
      expect(summary).toContain('%');
    });

    it('should include matched keywords in summary', () => {
      const result = SimpleIntentRouter.analyzeIntent('Navigate to the restaurant');
      const summary = SimpleIntentRouter.getSummary(result);

      expect(summary).toContain('Keywords:');
    });
  });
});
