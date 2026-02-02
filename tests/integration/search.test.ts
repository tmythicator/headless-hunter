import { searchJobsInDach } from '@/tools/index';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

describe('Puppeteer Search Integration', () => {
  const TIMEOUT = 60000;

  let originalNodeEnv: string | undefined;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    console.log('Test Environment: NODE_ENV set to test');
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  test(
    'should search using Puppeteer (DuckDuckGo) and return results',
    async () => {
      const query = 'Senior Software Engineer Berlin';
      const results = await searchJobsInDach(query, { max_results: 5 });

      console.log('Puppeteer Search Results:', JSON.stringify(results, null, 2));

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult.title).toBeDefined();
      expect(firstResult.url).toBeDefined();
      expect(firstResult.url).toMatch(/^http/);
      // Content might be empty string or null, but checks logic
      if (firstResult.content) {
        expect(typeof firstResult.content).toBe('string');
      }
    },
    TIMEOUT
  );
});
