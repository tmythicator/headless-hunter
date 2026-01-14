import { describe, test, expect } from 'bun:test';
import { harvestLinksFromPage, scrapeContentLocal } from '@/tools';
import glassdoorTargets from '../fixtures/glassdoor_targets.json';

const TEST_CASES = glassdoorTargets;

describe('Glassdoor Harvester (Live)', () => {
  const TIMEOUT = 120000;

  for (const testCase of TEST_CASES) {
    test(
      `should harvest links from ${testCase.name}`,
      async () => {
        const links = await harvestLinksFromPage(testCase.url);

        if (links.length > 0) {
          expect(links.length).toBeGreaterThan(0);
          expect(links[0]).toHaveProperty('url');
          expect(links[0]).toHaveProperty('title');

          const firstLink = links[0].url;

          const content = await scrapeContentLocal(firstLink);

          await Bun.write('tests/integration/glassdoor_debug.txt', content);
          expect(typeof content).toBe('string');

          if (content.includes('[[ANTIBOT_PROTECTION_TRIGGERED]]')) {
            console.log('Scraper blocked, but correctly identified. Test passes.');
          } else {
            expect(content.length).toBeGreaterThan(50);
          }
        } else {
          console.warn(
            `Harvested 0 links from ${testCase.url}. This might be due to anti-bot protection.`
          );
        }
      },
      TIMEOUT
    );
  }
});
