import { HumanMessage } from '@langchain/core/messages';
import { getModel } from '@/llm/model_factory';
import { AgentState } from './state';
import { searchJobsInDach, harvestLinksFromPage, scrapeContentLocal } from '@/tools';
import { ProfilerSummary, TavilySearchResult, ScoutSummary, AgentNode } from '@/types';
import { loadResume } from '@/tools/resume_loader';
import { logTrace } from '@/utils/logger';
import { createProfilerPrompt, createScoutPrompt } from '@/llm/prompts';
import { getParsedModelOutput } from '@/utils';
import {
  LOG_STAGE_SCOUT_SEARCH,
  LOG_STAGE_SCOUT_ERROR,
  LOG_MSG_MD_FAILED,
  LOG_MSG_WRITE_FAILED,
} from '@/config/constants';

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

function isHarvesterLink(r: TavilySearchResult): boolean {
  if (!r.url) return false;
  const url = r.url.toLowerCase();
  const title = r.title ? r.title.toLowerCase() : '';

  // Explicit Harvester Domains
  if (
    url.includes('glassdoor') ||
    url.includes('linkedin.com/jobs/search') ||
    url.includes('stepstone') ||
    url.includes('indeed')
  ) {
    return true;
  }

  // Heuristic: "Jobs" in title but not a specific job view
  if (title.includes('jobs') && !url.includes('/view/') && !url.includes('/job/')) {
    return true;
  }

  return false;
}

function isDirectCompanyLink(r: TavilySearchResult): boolean {
  if (!r.url) return false;
  return !r.url.includes('glassdoor') && !r.url.includes('search');
}

export async function scoutNode(state: typeof AgentState.State) {
  const profilerSummary = state.profiler_summary;

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

  // 1. Initial Search
  const searchResults = await searchJobsInDach(query, {
    max_results: 25,
    search_depth: 'advanced',
  });
  const searchResultsString = JSON.stringify(searchResults, null, 2);
  await logTrace(LOG_STAGE_SCOUT_SEARCH, query, searchResultsString);

  // 2. Identify all targets
  const targets = new Set<string>();

  // Harvester candidates (Top 2)
  searchResults
    .filter((r) => isHarvesterLink(r))
    .slice(0, 2)
    .forEach((r) => targets.add(r.url));

  // Direct candidates
  searchResults.filter((r) => isDirectCompanyLink(r)).forEach((r) => targets.add(r.url));

  return {
    job_targets: Array.from(targets).slice(0, 20), // Place cap (to resolve possible recursion limit problems)
    total_jobs: Math.min(targets.size, 20),
    processed_jobs: 0,
    search_results: searchResultsString,
    search_count: searchResults.length,
    messages: [new HumanMessage(`Scout found ${targets.size} primary targets.`)],
  };
}

export async function analystNode(state: typeof AgentState.State) {
  // Case 1: More jobs to process
  if (state.job_targets.length > 0) {
    const url = state.job_targets[0];
    const remainingTargets = state.job_targets.slice(1);
    let newKnowledge = '';
    const newScrapes: string[] = [];

    // Check if it's a harvester link (heuristic)
    const isHarvester =
      url.includes('glassdoor') ||
      url.includes('linkedin.com/jobs/search') ||
      url.includes('stepstone') ||
      url.includes('indeed');

    if (isHarvester) {
      const harvestedJobs = await harvestLinksFromPage(url);
      if (harvestedJobs.length > 0) {
        // Scrape 2 harvested links to save time
        const bestJobs = harvestedJobs.slice(0, 2);
        for (const job of bestJobs) {
          const content = await scrapeContentLocal(job.url);
          if (content.length > 100) {
            newKnowledge += `\n\n--- HARVESTED JOB SOURCE: ${job.url} (${job.title}) ---\n${content}\n`;
            newScrapes.push(job.url);
          }
        }
      }
    } else {
      // Direct scrape
      const content = await scrapeContentLocal(url);
      if (content.length > 100) {
        newKnowledge += `\n\n--- SOURCE: ${url} ---\n${content}`;
        newScrapes.push(url);
      }
    }

    return {
      job_targets: remainingTargets,
      processed_jobs: state.processed_jobs + 1,
      scraped_knowledge: newKnowledge,
      successful_scrapes: newScrapes,
      messages: [new HumanMessage(`Processed ${url}`)],
    };
  }
  return {};
}

export async function reporterNode(state: typeof AgentState.State) {
  const model = getModel(AgentNode.SCOUT);
  const profilerSummary = state.profiler_summary;
  const resume = state.user_input_resume;

  const scoutPrompt = createScoutPrompt(
    profilerSummary,
    resume,
    state.search_results,
    state.scraped_knowledge,
    'See previous logs for full library',
    state.successful_scrapes.join('\n')
  );

  const response = await model.invoke([new HumanMessage(scoutPrompt)]);
  const scoutSummary = await getParsedModelOutput<ScoutSummary>(response, AgentNode.SCOUT, {
    market_summary: 'Error generating report.',
    jobs: [],
  });

  let markdownReport = '';
  try {
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
    await logTrace(LOG_STAGE_SCOUT_ERROR, LOG_MSG_MD_FAILED, String(err));
    markdownReport = 'Check logs. Model failed to generate report.';
  }

  // Write result
  try {
    const outFile = state.config_output_path || 'result.md';
    await Bun.write(outFile, markdownReport);
  } catch (e) {
    await logTrace(LOG_STAGE_SCOUT_ERROR, LOG_MSG_WRITE_FAILED, String(e));
  }

  return {
    messages: [new HumanMessage(markdownReport)],
    scout_summary: scoutSummary,
    is_finished: true,
  };
}
