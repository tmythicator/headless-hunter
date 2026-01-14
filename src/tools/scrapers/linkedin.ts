import { ScraperStrategy, ScrapedJob } from './types';
import { Page } from 'puppeteer';
import { logTrace } from '@/utils/logger';

export const linkedinScraper: ScraperStrategy = {
  name: 'LinkedIn Scraper',

  canHandle: (url: string) => url.includes('linkedin.com') || url.includes('linkedin.de'),

  harvestLinks: async (page: Page, url: string): Promise<ScrapedJob[]> => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const currentUrl = window.location.href.split('#')[0];

      return anchors
        .filter((a) => {
          const href = a.href;
          const lower = href.toLowerCase();
          return (
            lower.includes('/jobs/view/') ||
            lower.includes('currentjobid=') ||
            lower.includes('currentJobId=')
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

    await new Promise((resolve) => setTimeout(resolve, 4000));
    await page.mouse.move(Math.random() * 500, Math.random() * 500);

    const content = await page.evaluate(() => {
      const liContainer =
        document.querySelector('.jobs-description') ??
        document.querySelector('.description__text') ??
        document.querySelector('#job-details');
      if (liContainer) {
        return (liContainer as HTMLElement).innerText;
      }
      return document.body.innerText.replace(/\n\s*\n/g, '\n').substring(0, 8000);
    });

    if (content.includes('Join LinkedIn') || content.includes('Sign In to LinkedIn')) {
      await logTrace('HARVESTER_WARN', url, 'LinkedIn Quote/Auth Wall triggered.');
      return '[[ANTIBOT_PROTECTION_TRIGGERED]]';
    }

    return content;
  },
};
