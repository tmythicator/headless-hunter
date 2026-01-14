import { describe, expect, test } from 'bun:test';
import { extractUrlContent } from '@/tools/index';

describe('Local Extraction Integration', () => {
  const TIMEOUT = 60000;

  test(
    'should extract content from URLs using local scraper',
    async () => {
      const urls = ['https://example.com', 'https://httpbin.org/html'];

      const results = await extractUrlContent(urls);

      console.log(
        'Extraction Results:',
        JSON.stringify(
          results.map((r) => ({ url: r.url, title: r.title, contentLen: r.content?.length })),
          null,
          2
        )
      );

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(2);

      results.forEach((r) => {
        expect(r.url).toBeDefined();
        // The local scraper returns the body text.
        expect(typeof r.content).toBe('string');
        expect(r.content?.length).toBeGreaterThan(10);
        expect(r.title).toBe('Local Extract');
      });
    },
    TIMEOUT
  );
});
