import { TavilySearchResult } from '@/types';
import { launchBrowser } from './utils';
import { logTrace } from '@/utils/logger';

export async function searchWithPuppeteer(query: string): Promise<TavilySearchResult[]> {
  const { browser, page } = await launchBrowser();

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const fixedResults = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.result'));
      return items
        .map((item) => {
          const titleEl = item.querySelector('.result__a');
          const snippetEl = item.querySelector('.result__snippet');

          if (!titleEl) return null;

          const link = (titleEl as HTMLAnchorElement).href;
          const title = (titleEl as HTMLElement).innerText;
          const content = snippetEl ? (snippetEl as HTMLElement).innerText : '';

          return {
            title,
            url: link,
            content,
            score: 1.0,
            raw_content: null,
          } as TavilySearchResult;
        })
        .filter((r): r is TavilySearchResult => r?.url?.startsWith('http') ?? false);
    });

    await logTrace('PUPPETEER_SEARCH', query, JSON.stringify(fixedResults, null, 2));
    return fixedResults;
  } catch (e) {
    await logTrace('PUPPETEER_SEARCH_ERROR', query, String(e));
    return [];
  } finally {
    await browser.close();
  }
}
