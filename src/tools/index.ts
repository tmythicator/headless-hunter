import { logTrace } from '@/utils/logger';

import { TavilySearchResult } from '@/types';
import { MessageContent } from '@langchain/core/messages';
import { getScraper } from './scrapers';
import { launchBrowser } from './scrapers/utils';
import { ScraperStrategy } from './scrapers/types';
import { Page } from 'puppeteer';

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
  if (isPuppeteerMode()) {
    await logTrace('SEARCH_PROVIDER', 'Using Puppeteer (DuckDuckGo)', query);
    return searchWithPuppeteer(query);
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    // If no key, fallback to puppeteer instead of failing
    await logTrace('TAVILY_WARNING', 'Missing API Key', 'Falling back to Puppeteer search');
    return searchWithPuppeteer(query);
  }

  const payload = {
    api_key: apiKey,
    query: query,
    search_depth: options.search_depth ?? 'basic',
    max_results: options.max_results ?? 10,
    include_domains: options.include_domains ?? [],
    exclude_domains: options.exclude_domains ?? [],
  };

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.statusText}`);
    }

    const data = (await response.json()) as { results: TavilySearchResult[] };
    const results = data.results ?? [];

    await logTrace(
      'TAVILY_FETCH',
      JSON.stringify(payload, null, 2),
      JSON.stringify(results, null, 2)
    );
    return results;
  } catch (error) {
    await logTrace('TAVILY_ERROR', 'Search Failed', String(error));
    return [];
  }
}

export async function extractUrlContent(urls: string[]): Promise<TavilySearchResult[]> {
  await logTrace('EXTRACT_PROVIDER', 'Using Puppeteer (Local)', `${urls.length} URLs`);

  const results = await Promise.all(
    urls.map(async (url) => {
      // Use scrapeContentLocal which handles browser lifecycle and errors
      const content = await scrapeContentLocal(url);
      return {
        url,
        content,
        title: 'Local Extract', // Metadata limited in local scrape
        score: 1.0,
        raw_content: content,
      };
    })
  );

  return results;
}

async function runWithScraper<T>(
  url: string,
  actionName: string,
  fn: (scraper: ScraperStrategy, page: Page) => Promise<T>
): Promise<T | null> {
  const scraper = getScraper(url);
  const { browser, page } = await launchBrowser();

  try {
    const result = await fn(scraper, page);
    return result;
  } catch (e) {
    await logTrace(`${actionName}_ERROR`, url, String(e));
    return null;
  } finally {
    await browser.close();
  }
}

export async function harvestLinksFromPage(url: string): Promise<{ url: string; title: string }[]> {
  const result = await runWithScraper(url, 'HARVESTER', async (scraper, page) => {
    const links = await scraper.harvestLinks(page, url);

    if (links.length === 0) {
      const content = await page.content();
      await logTrace('HARVESTER_DEBUG_HTML', url, content.substring(0, 2000));
    }

    await logTrace('HARVESTER_LINKS', url, JSON.stringify(links, null, 2));
    return links;
  });

  return result ?? [];
}

export async function scrapeContentLocal(url: string): Promise<string> {
  const result = await runWithScraper(url, 'HARVESTER_SCRAPE', async (scraper, page) => {
    const content = await scraper.scrapeContent(page, url);
    await logTrace('HARVESTER_SCRAPE', url, content.substring(0, 500) + '...');
    return content;
  });

  return result ?? `Failed to scrape ${url} locally.`;
}

export function ensureString(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  return JSON.stringify(content);
}
