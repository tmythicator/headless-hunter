import { ScraperStrategy, ScrapedJob } from './types';
import { Page } from 'puppeteer';

export const genericScraper: ScraperStrategy = {
  name: 'Generic Scraper',

  canHandle: () => true, // Fallback

  harvestLinks: async (page: Page, url: string): Promise<ScrapedJob[]> => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const currentUrl = window.location.href.split('#')[0];

      return anchors
        .filter((a) => {
          const href = a.href;
          const lower = href.toLowerCase();
          return (
            lower.includes('/job/') ||
            lower.includes('/view/') ||
            lower.includes('/position/') ||
            lower.includes('/career/') ||
            lower.includes('/vacancy/')
          );
        })
        .filter((a) => !a.href.startsWith(currentUrl + '#'))
        .filter(
          (a) => !a.href.includes('login') && !a.href.includes('signup') && !a.href.includes('auth')
        )
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
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return page.evaluate(() => {
      const elementsToRemove = document.querySelectorAll(
        'script, style, nav, header, footer, iframe, .ad, .advertisement'
      );
      elementsToRemove.forEach((el) => el.remove());
      return document.body.innerText.replace(/\n\s*\n/g, '\n').substring(0, 8000);
    });
  },
};
