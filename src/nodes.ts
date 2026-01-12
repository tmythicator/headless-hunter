import fs from 'fs';
import path from 'path';
import { HumanMessage } from '@langchain/core/messages';
import { getModel } from './model_factory';
import { AgentState } from './state';
import {
  searchJobsInDach,
  extractUrlContent,
  harvestLinksFromPage,
  scrapeContentLocal,
} from './tools';
import { ProfilerSummary, TavilySearchResult, ScoutSummary, AgentNode } from './types';
import { loadResume } from './resume_loader';
import { logTrace } from './logger';
import { createProfilerPrompt, createScoutPrompt } from './prompts';
import { getParsedModelOutput } from './utils';

export async function profilerNode(state: typeof AgentState.State) {
  const model = getModel(AgentNode.PROFILER);

  const resumeContent = await loadResume(state.resume_path);

  const profilerPrompt = createProfilerPrompt(state.user_input_prompt, resumeContent);
  const profilerResponse = await model.invoke([new HumanMessage(profilerPrompt)]);
  const prefs = await getParsedModelOutput<ProfilerSummary>(profilerResponse, AgentNode.PROFILER, {
    role: state.user_input_prompt,
    keywords: [],
    location: '',
    min_salary: null,
    vibe: '',
  });

  return {
    profiler_summary: prefs,
    user_input_resume: resumeContent,
    messages: [new HumanMessage(`Strategy: Hunting for ${prefs.role} in ${prefs.location}`)],
  };
}

export async function scoutNode(state: typeof AgentState.State) {
  const model = getModel(AgentNode.SCOUT);
  const profilerSummary = state.profiler_summary;
  const resume = state.user_input_resume;

  const baseQuery = `${profilerSummary.role} ${profilerSummary.keywords.slice(0, 3).join(' ')} ${profilerSummary.location} ${profilerSummary.country ?? ''}`;
  const siteConstraints = [
    'site:linkedin.com/jobs/view/',
    'site:glassdoor.com/job-listing/',
    'site:boards.greenhouse.io',
    'site:jobs.lever.co',
    'site:apply.workable.com',
    'site:personio.de',
    'site:join.com',
    'site:wellfound.com',
  ].join(' OR ');

  const query = `${baseQuery} (${siteConstraints}) "apply" -inurl:search -inurl:SRCH -inurl:jobs-at`;

  // 2. Initial Search
  const searchResults = await searchJobsInDach(query, {
    max_results: 25,
    search_depth: 'advanced',
  });
  const searchResultsString = JSON.stringify(searchResults, null, 2);
  await logTrace('SCOUT_SEARCH', query, searchResultsString);

  // 3. Collect verified links
  const verifiedLinksMap = new Map<string, string>();
  searchResults.forEach((r: TavilySearchResult) => {
    if (r.url) verifiedLinksMap.set(r.url, r.title || 'No Title');
  });

  // Harvester (Local Puppeteer)
  const harvestTargets = searchResults
    .filter(
      (r: TavilySearchResult) =>
        r.url &&
        (r.url.includes('glassdoor') ||
          r.url.includes('linkedin.com/jobs/search') ||
          r.url.includes('stepstone') ||
          r.url.includes('indeed') ||
          (r.title &&
            r.title.toLowerCase().includes('jobs') &&
            !r.url.includes('/view/') &&
            !r.url.includes('/job/')))
    )
    .slice(0, 2);

  let scrapedKnowledge = '';

  // Harvest locally
  const successfulScrapes = new Set<string>();

  if (harvestTargets.length > 0) {
    for (const target of harvestTargets) {
      const harvestedJobs = await harvestLinksFromPage(target.url);
      if (harvestedJobs.length > 0) {
        // Add harvested links to verified map
        harvestedJobs.forEach((job) => verifiedLinksMap.set(job.url, `Harvested: ${job.title}`));

        // Scrape content locally (Saving Tavily Quota)
        // Only scrape the first 3 harvested links per list to save time/bandwidth
        const bestJobs = harvestedJobs.slice(0, 3);

        for (const job of bestJobs) {
          const content = await scrapeContentLocal(job.url);
          if (content.length > 100) {
            scrapedKnowledge += `\n\n--- HARVESTED JOB SOURCE: ${job.url} (${job.title}) ---\n${content}\n`;
            successfulScrapes.add(job.url);
          }
        }
      }
    }
  }

  if (scrapedKnowledge.length < 500) {
    const directLinks = searchResults
      .filter((r: TavilySearchResult) => !r.url.includes('glassdoor') && !r.url.includes('search'))
      .slice(0, 2)
      .map((r: TavilySearchResult) => r.url);

    if (directLinks.length > 0) {
      const scrapedDocs = await extractUrlContent(directLinks);
      scrapedDocs.forEach((d: TavilySearchResult) => {
        const txt = d.raw_content ?? d.content ?? '';
        scrapedKnowledge += `\n\n--- TAVILY SOURCE: ${d.url} ---\n${txt}`;
        if (txt.length > 100) successfulScrapes.add(d.url);
      });
    }
  }

  const verifiedLinksLibrary = Array.from(verifiedLinksMap.entries())
    .map(([url, title]) => {
      return `- ${title}: ${url}`;
    })
    .join('\n');

  const verifiedScrapesList = Array.from(successfulScrapes).join('\n');

  const scoutPrompt = createScoutPrompt(
    profilerSummary,
    resume,
    searchResultsString,
    scrapedKnowledge,
    verifiedLinksLibrary,
    verifiedScrapesList
  );

  const response = await model.invoke([new HumanMessage(scoutPrompt)]);
  const scoutSummary = await getParsedModelOutput<ScoutSummary>(response, AgentNode.SCOUT, {
    market_summary: 'Error generating report.',
    jobs: [],
  });

  let markdownReport = '';

  try {
    // Generate Markdown for UI/File
    markdownReport = `# Headless Hunter Report\n\n`;
    markdownReport += `**Market Summary:** ${scoutSummary.market_summary}\n\n`;
    markdownReport += `## Top Picks\n\n`;

    scoutSummary.jobs.forEach((job) => {
      const badgeStr = job.badges.join(' ');
      markdownReport += `### ${job.title} @ ${job.company} (${job.location})\n`;
      markdownReport += `* **Verdict:** ${job.verdict} ${badgeStr}\n`;
      markdownReport += `* **Verified Stack:** ${job.tech_stack.join(', ')}\n`;
      markdownReport += `* **Cynical Take:** ${job.cynical_take}\n`;
      markdownReport += `* **Why it fits:** ${job.why_it_fits}\n`;
      markdownReport += `* **Link:** [Apply Here](${job.url})\n\n`;
      markdownReport += `---\n\n`;
    });
  } catch (err) {
    await logTrace('SCOUT_ERROR', 'Markdown Generation Failed', String(err));
    markdownReport = 'Check logs. Model failed to generate report.';
  }

  // Write result
  try {
    const outFile = state.config_output_path || 'result.md';
    await Bun.write(outFile, markdownReport);
  } catch (e) {
    await logTrace('SCOUT_ERROR', 'Failed to write result.md', String(e));
  }

  return {
    messages: [new HumanMessage(markdownReport)],
    scout_summary: scoutSummary,
  };
}
