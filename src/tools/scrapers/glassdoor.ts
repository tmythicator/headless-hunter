import { ScraperStrategy, ScrapedJob } from './types';
import { Page } from 'puppeteer';
import { logTrace } from '@/utils/logger';

export const glassdoorScraper: ScraperStrategy = {
  name: 'Glassdoor Scraper',

  canHandle: (url: string) => url.includes('glassdoor') || url.includes('Glassdoor'),

  harvestLinks: async (page: Page, url: string): Promise<ScrapedJob[]> => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));
    await page.mouse.move(Math.random() * 500, Math.random() * 500);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const title = await page.title();

    if (url.includes('/job-listing/') || url.includes('?jl=')) {
      return [
        {
          url: url,
          title: title.replace(' | Glassdoor', '').trim(),
        },
      ];
    }

    return page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const currentUrl = window.location.href.split('#')[0];

      return anchors
        .filter((a) => {
          const href = a.href;
          const lower = href.toLowerCase();
          return lower.includes('/partner/job/listing') || lower.includes('/job-listing/');
        })
        .filter((a) => !a.href.startsWith(currentUrl + '#'))
        .filter((a) => !a.href.includes('login') && !a.href.includes('signup'))
        .map((a) => {
          let title = a.innerText.trim();
          if (!title) title = a.title || 'Unknown Job';
          return { url: a.href, title: title };
        })
        .filter((v, i, a) => a.findIndex((t) => t.url === v.url) === i)
        .slice(0, 10);
    });
  },

  scrapeContent: async (page: Page, url: string): Promise<string> => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 2000));
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200, { steps: 10 });
    await page.mouse.down();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await page.mouse.up();
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const content = await page.evaluate(() => {
      const gdContainer = document.querySelector('div[class*="JobDetails_jobDescription"]');
      if (gdContainer) {
        return (gdContainer as HTMLElement).innerText;
      }
      return document.body.innerText.replace(/\n\s*\n/g, '\n').substring(0, 8000);
    });

    if (
      content.includes('Help Us Protect Glassdoor') ||
      content.includes('Helfen Sie mit, Glassdoor zu schützen') ||
      content.includes('Pardon Our Interruption')
    ) {
      await logTrace('HARVESTER_WARN', url, 'Bot detection triggered.');
      return '[[ANTIBOT_PROTECTION_TRIGGERED]]';
    }

    return content;
  },
};
