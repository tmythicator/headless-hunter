import { ScraperStrategy } from './types';
import { glassdoorScraper } from './glassdoor';
import { linkedinScraper } from './linkedin';
import { genericScraper } from './generic';

const strategies: ScraperStrategy[] = [
  glassdoorScraper,
  linkedinScraper,
  genericScraper, // Fallback
];

export function getScraper(url: string): ScraperStrategy {
  return strategies.find((s) => s.canHandle(url)) ?? genericScraper;
}
