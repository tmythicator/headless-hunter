import { TavilySearchResult } from '@/types';
import { logTrace } from '@/utils/logger';
import type { MessageContent } from '@langchain/core/messages';
import { Page } from 'puppeteer';
import { getScraper } from './scrapers';
import { ScraperStrategy } from './scrapers/types';
import { launchBrowser } from './scrapers/utils';

import { searchWithPuppeteer } from './scrapers/search';

const isPuppeteerMode = () => process.env.NODE_ENV === 'test';

export async function searchJobsInDach(
  query: string,
  options: {
    max_results?: number;
    search_depth?: 'basic' | 'advanced';
    include_domains?: string[];
    exclude_domains?: string[];
  } = {}
): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (isPuppeteerMode() || !apiKey) {
    if (!apiKey) await logTrace('TAVILY_WARNING', 'Missing API Key', 'Falling back to Puppeteer');
    return searchWithPuppeteer(query);
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options.search_depth ?? 'basic',
        max_results: options.max_results ?? 10,
        include_domains: options.include_domains ?? [],
        exclude_domains: options.exclude_domains ?? [],
      }),
    });

    if (!response.ok) throw new Error(`Tavily API error: ${response.statusText}`);

    const { results = [] } = (await response.json()) as { results: TavilySearchResult[] };
    await logTrace('TAVILY_FETCH', query, JSON.stringify(results, null, 2));
    return results;
  } catch (error) {
    await logTrace('TAVILY_ERROR', 'Search Failed', String(error));
    return [];
  }
}

export async function extractUrlContent(urls: string[]): Promise<TavilySearchResult[]> {
  return Promise.all(
    urls.map(async (url) => {
      const content = await scrapeContentLocal(url);
      return { url, content, title: 'Local Extract', score: 1.0, raw_content: content };
    })
  );
}

async function runWithScraper<T>(
  url: string,
  actionName: string,
  fn: (scraper: ScraperStrategy, page: Page) => Promise<T>
): Promise<T | null> {
  const { browser, page } = await launchBrowser();
  try {
    return await fn(getScraper(url), page);
  } catch (e) {
    await logTrace(`${actionName}_ERROR`, url, String(e));
    return null;
  } finally {
    await browser.close();
  }
}

export async function harvestLinksFromPage(url: string) {
  return (
    (await runWithScraper(url, 'HARVESTER', async (scraper, page) => {
      const links = await scraper.harvestLinks(page, url);
      await logTrace('HARVESTER_LINKS', url, JSON.stringify(links, null, 2));
      return links;
    })) ?? []
  );
}

export async function scrapeContentLocal(url: string): Promise<string> {
  const result = await runWithScraper(url, 'SCRAPE', (scraper, page) =>
    scraper.scrapeContent(page, url)
  );
  return result ?? `Failed to scrape ${url}`;
}

export function ensureString(content: MessageContent): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}
