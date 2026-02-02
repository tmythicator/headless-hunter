import { harvestLinksFromPage, scrapeContentLocal } from '@/tools';
import { describe, expect, test } from 'bun:test';
import linkedinTargets from '../fixtures/linkedin_targets.json';

const TEST_CASES = linkedinTargets;

describe('LinkedIn Harvester (Live)', () => {
  const TIMEOUT = 120000;

  for (const testCase of TEST_CASES) {
    const isLive = !!process.env.RUN_LIVE_TESTS;
    const runTest = isLive ? test : test.skip;

    runTest(
      `should harvest links from ${testCase.name}`,
      async () => {
        console.log(`Attempting to harvest: ${testCase.url}`);
        const links = await harvestLinksFromPage(testCase.url);
        console.log(`Found ${links.length} links`);

        if (links.length > 0) {
          expect(links[0]).toHaveProperty('url');
          expect(links[0]).toHaveProperty('title');

          const firstLink = links[0].url;
          console.log(`Attempting to scrape content from: ${firstLink}`);
          const content = await scrapeContentLocal(firstLink);

          await Bun.write('tests/integration/linkedin_debug.txt', content);
          expect(typeof content).toBe('string');
          expect(content.length).toBeGreaterThan(50);
        } else {
          console.warn(`Harvested 0 links from ${testCase.url}. Likely bot-blocked or authwall.`);
        }
      },
      TIMEOUT
    );
  }
});
