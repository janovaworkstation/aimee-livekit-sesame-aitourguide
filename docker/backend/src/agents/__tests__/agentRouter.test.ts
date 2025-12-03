import { AgentRouter } from '../agentRouter';
import { createDefaultContext } from '../types';

describe('AgentRouter', () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = new AgentRouter();
  });

  describe('Agent Selection (routing logic only)', () => {
    it('should route "My name is Jeff" to Memory agent', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents('My name is Jeff', context);

      // Memory agent should have highest confidence
      const memoryResult = results.find((r: any) => r.agent === 'Memory');
      expect(memoryResult).toBeDefined();
      expect(memoryResult.canHandle).toBe(true);
      expect(memoryResult.confidence).toBeGreaterThan(0.5);

      // Memory should be first (highest confidence)
      expect(results[0].agent).toBe('Memory');
    });

    it('should route navigation query to Navigator agent', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents('Where is the nearest restaurant?', context);

      const navigatorResult = results.find((r: any) => r.agent === 'Navigator');
      expect(navigatorResult).toBeDefined();
      expect(navigatorResult.canHandle).toBe(true);
    });

    it('should route history query to Historian agent', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents('Tell me about the history of this building', context);

      const historianResult = results.find((r: any) => r.agent === 'Historian');
      expect(historianResult).toBeDefined();
      expect(historianResult.canHandle).toBe(true);
      expect(historianResult.confidence).toBeGreaterThan(0.3);
    });

    it('should route activity query to Experience agent', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents('What should I do here?', context);

      const experienceResult = results.find((r: any) => r.agent === 'Experience');
      expect(experienceResult).toBeDefined();
      expect(experienceResult.canHandle).toBe(true);
    });

    it('should route session start messages to Memory agent', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents(
        '[SYSTEM: This is a new session. Check if the user has a stored name.]',
        context
      );

      // For session start, Memory should be able to handle
      const memoryResult = results.find((r: any) => r.agent === 'Memory');
      expect(memoryResult).toBeDefined();
    });

    it('should handle reconnection messages', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents(
        '[SYSTEM: The user has just reconnected after briefly leaving.]',
        context
      );

      // Memory should handle reconnection
      const memoryResult = results.find((r: any) => r.agent === 'Memory');
      expect(memoryResult).toBeDefined();
    });
  });

  describe('getAvailableAgents', () => {
    it('should return all four agents', () => {
      const agents = router.getAvailableAgents();

      expect(agents.length).toBe(4);
      expect(agents.map(a => a.name)).toContain('Navigator');
      expect(agents.map(a => a.name)).toContain('Historian');
      expect(agents.map(a => a.name)).toContain('Experience');
      expect(agents.map(a => a.name)).toContain('Memory');
    });

    it('should include descriptions for all agents', () => {
      const agents = router.getAvailableAgents();

      for (const agent of agents) {
        expect(agent.description).toBeDefined();
        expect(agent.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('testAllAgents', () => {
    it('should return results sorted by confidence', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents('My name is Jeff', context);

      // Results should be sorted by confidence descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].confidence).toBeGreaterThanOrEqual(results[i + 1].confidence);
      }
    });

    it('should include canHandle for each agent', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents('Hello', context);

      for (const result of results) {
        expect(typeof result.canHandle).toBe('boolean');
      }
    });

    it('should include confidence for each agent', async () => {
      const context = createDefaultContext('test-user');
      const results = await router.testAllAgents('Hello', context);

      for (const result of results) {
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input gracefully', async () => {
      const context = createDefaultContext('test-user');

      // Should not throw
      const results = await router.testAllAgents('', context);
      expect(results.length).toBe(4);
    });

    it('should handle very long input', async () => {
      const context = createDefaultContext('test-user');
      const longInput = 'Tell me about history '.repeat(100);

      // Should not throw
      const results = await router.testAllAgents(longInput, context);
      expect(results.length).toBe(4);
    });

    it('should handle special characters in input', async () => {
      const context = createDefaultContext('test-user');

      // Should not throw
      const results = await router.testAllAgents('What about @#$%^& symbols?', context);
      expect(results.length).toBe(4);
    });
  });
});
