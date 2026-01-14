import { Page } from 'puppeteer';

export interface ScrapedJob {
  url: string;
  title: string;
  description?: string;
  company?: string;
  location?: string;
}

export interface ScraperStrategy {
  name: string;
  canHandle(url: string): boolean;
  harvestLinks(page: Page, url: string): Promise<ScrapedJob[]>;
  scrapeContent(page: Page, url: string): Promise<string>;
}
