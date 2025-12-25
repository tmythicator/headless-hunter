import puppeteer from "puppeteer";
import { logTrace } from "./logger";

export async function searchJobsInDach(query: string, options: {
    max_results?: number,
    search_depth?: "basic" | "advanced",
    include_domains?: string[],
    exclude_domains?: string[]
} = {}) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        await logTrace("TAVILY_ERROR", "Missing API Key", "TAVILY_API_KEY is not set in .env");
        return "[]";
    }

    const payload = {
        api_key: apiKey,
        query: query,
        search_depth: options.search_depth || "basic",
        max_results: options.max_results || 10,
        include_domains: options.include_domains || [],
        exclude_domains: options.exclude_domains || []
    };

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Tavily API error: ${response.statusText}`);
        }

        const data = await response.json();
        const results = data.results || [];
        
        await logTrace("TAVILY_FETCH", JSON.stringify(payload, null, 2), JSON.stringify(results, null, 2));
        return results;
    } catch (error) {
        await logTrace("TAVILY_ERROR", "Search Failed", String(error));
        return [];
    }
}

export async function extractUrlContent(urls: string[]) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        await logTrace("TAVILY_ERROR", "Missing API Key", "TAVILY_API_KEY is not set in .env");
        return "[]";
    }

    const payload = {
        api_key: apiKey,
        urls: urls,
        extract_depth: "advanced"
    };

    try {
        const response = await fetch("https://api.tavily.com/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Tavily Extract API error: ${response.statusText}`);
        }

        const data = await response.json();
        const results = data.results || [];
        
        await logTrace("TAVILY_EXTRACT", JSON.stringify(payload, null, 2), JSON.stringify(results, null, 2));
        return results;
    } catch (error) {
        await logTrace("TAVILY_ERROR", "Extraction Failed", String(error));
        return [];
    }
}

export async function harvestLinksFromPage(url: string): Promise<{url: string, title: string}[]> {
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ],
  });
  
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const title = await page.title();

    // 1. Single Job Detection (Glassdoor)
    if (url.includes('glassdoor') && (url.includes('/job-listing/') || url.includes('?jl='))) {
        return [{
            url: url,
            title: title.replace(' | Glassdoor', '').trim()
        }];
    }

    // 2. Generic harvester with domain-specific heuristics
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const currentUrl = window.location.href.split('#')[0];
      const hostname = window.location.hostname;
      
      return anchors
        .filter(a => {
            const href = a.href;
            const lower = href.toLowerCase();
            
            // 1. Glassdoor: Strict
            if (hostname.includes('glassdoor')) {
                return (lower.includes('/partner/job/listing') || lower.includes('/job-listing/'));
            }
            
            // 2. LinkedIn: Strict
            if (hostname.includes('linkedin')) {
                return (lower.includes('/jobs/view/') || lower.includes('currentjobid='));
            }
           
            // 3. Generic/Others
            return (
                lower.includes('/job/') || 
                lower.includes('/view/') || 
                lower.includes('/position/') || 
                lower.includes('/career/') || 
                lower.includes('/vacancy/')
            );
        })
        .filter(a => !a.href.startsWith(currentUrl + '#')) // Exclude anchors on same page
        .filter(a => !a.href.includes('login') && !a.href.includes('signup') && !a.href.includes('auth'))
        .map(a => {
            let title = a.innerText.trim();
            if(!title) title = a.title || "Unknown Job";
            return { url: a.href, title: title };
        })
        .filter((v, i, a) => a.findIndex(t => t.url === v.url) === i)
        .slice(0, 10);
    });
    
    // Debug if empty
    if (links.length === 0) {
        const content = await page.content();
        await logTrace("HARVESTER_DEBUG_HTML", url, content.substring(0, 2000));
    }
    await logTrace("HARVESTER_LINKS", url, JSON.stringify(links, null, 2));
    
    return links;

  } catch (e) {
    await logTrace("HARVESTER_ERROR", url, String(e));
    return [];
  } finally {
    await browser.close();
  }
}

export async function scrapeContentLocal(url: string): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled', // Stealth
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });
    
    const page = await browser.newPage();
    
    // Set Referer to look like it came from Glassdoor search
    await page.setExtraHTTPHeaders({
        'Referer': 'https://www.glassdoor.com/',
        'Accept-Language': 'en-US,en;q=0.9'
    });
  
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      
      // Extract text content safely with domain-specific targets
      const content = await page.evaluate(() => {
          // 1. Glassdoor Specific Extraction
          const gdContainer = document.querySelector('div[class*="JobDetails_jobDescription"]');
          if (gdContainer) {
              return (gdContainer as HTMLElement).innerText;
          }

          // 2. Generic Fallback
          const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, iframe, .ad, .advertisement');
          elementsToRemove.forEach(el => el.remove());
          
          return document.body.innerText.replace(/\n\s*\n/g, '\n').substring(0, 8000); // Limit size
      });
  
      await logTrace("HARVESTER_SCRAPE", url, content.substring(0, 500) + "...");

      return content;
  
    } catch (e) {
      await logTrace("HARVESTER_SCRAPE_ERROR", url, String(e));
      return `Failed to scrape ${url} locally. Error: ${e}`;
    } finally {
      await browser.close();
    }
}