import {
  LOG_MSG_WRITE_FAILED,
  LOG_STAGE_SCOUT_ERROR,
  LOG_STAGE_SCOUT_SEARCH,
} from '@/config/constants';
import { getModel } from '@/llm/model_factory';
import { createProfilerPrompt, createScoutPrompt } from '@/llm/prompts';
import { harvestLinksFromPage, scrapeContentLocal, searchJobsInDach } from '@/tools';
import { loadResume } from '@/tools/resume_loader';
import { AgentNode, ProfilerSummary, ScoutSummary, TavilySearchResult } from '@/types';
import { getParsedModelOutput } from '@/utils';
import { logTrace } from '@/utils/logger';
import { HumanMessage } from '@langchain/core/messages';
import { AgentStateType } from './state';

export async function profilerNode(state: AgentStateType) {
  const model = getModel(AgentNode.PROFILER);
  const resumeContent = await loadResume(state.resume_path);
  const profilerPrompt = createProfilerPrompt(state.user_input_prompt, resumeContent);

  const response = await model.invoke([new HumanMessage(profilerPrompt)]);
  const prefs = await getParsedModelOutput<ProfilerSummary>(response, AgentNode.PROFILER, {
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

const HARVESTER_DOMAINS = ['glassdoor', 'linkedin.com/jobs/search', 'stepstone', 'indeed'];

function isHarvesterLink(r: TavilySearchResult): boolean {
  const url = r.url?.toLowerCase() || '';
  const title = r.title?.toLowerCase() || '';

  const isKnownDomain = HARVESTER_DOMAINS.some((domain) => url.includes(domain));
  const isGenericJobsPage =
    title.includes('jobs') && !url.includes('/view/') && !url.includes('/job/');

  return isKnownDomain || isGenericJobsPage;
}

function isDirectCompanyLink(r: TavilySearchResult): boolean {
  const url = r.url?.toLowerCase() || '';
  return !url.includes('glassdoor') && !url.includes('search');
}

export async function scoutNode(state: AgentStateType) {
  const { role, keywords, location, country } = state.profiler_summary;

  const baseQuery = `${role} ${keywords.slice(0, 3).join(' ')} ${location} ${country ?? ''}`;
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

  const searchResults = await searchJobsInDach(query, {
    max_results: 25,
    search_depth: 'advanced',
  });
  await logTrace(LOG_STAGE_SCOUT_SEARCH, query, JSON.stringify(searchResults, null, 2));

  const targets = new Set<string>();
  searchResults
    .filter(isHarvesterLink)
    .slice(0, 2)
    .forEach((r) => targets.add(r.url));
  searchResults.filter(isDirectCompanyLink).forEach((r) => targets.add(r.url));

  const finalTargets = Array.from(targets).slice(0, 20);

  return {
    job_targets: finalTargets,
    total_jobs: finalTargets.length,
    processed_jobs: 0,
    search_results: JSON.stringify(searchResults, null, 2),
    search_count: searchResults.length,
    messages: [new HumanMessage(`Scout found ${targets.size} primary targets.`)],
  };
}

export async function analystNode(state: AgentStateType) {
  if (state.job_targets.length === 0) return {};

  const [url, ...remainingTargets] = state.job_targets;
  let newKnowledge = '';
  const newScrapes: string[] = [];

  const isHarvester = HARVESTER_DOMAINS.some((domain) => url.includes(domain));

  if (isHarvester) {
    const harvestedJobs = await harvestLinksFromPage(url);
    const bestJobs = harvestedJobs.slice(0, 2);
    for (const job of bestJobs) {
      const content = await scrapeContentLocal(job.url);
      if (content.length > 100) {
        newKnowledge += `\n\n--- HARVESTED SOURCE: ${job.url} (${job.title}) ---\n${content}\n`;
        newScrapes.push(job.url);
      }
    }
  } else {
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

export async function reporterNode(state: AgentStateType) {
  const model = getModel(AgentNode.SCOUT);
  const prompt = createScoutPrompt(
    state.profiler_summary,
    state.user_input_resume,
    state.search_results,
    state.scraped_knowledge,
    'See previous logs for full library',
    state.successful_scrapes.join('\n')
  );

  const response = await model.invoke([new HumanMessage(prompt)]);
  const scoutSummary = await getParsedModelOutput<ScoutSummary>(response, AgentNode.SCOUT, {
    market_summary: 'Error generating report.',
    jobs: [],
  });

  let report = `# Headless Hunter Report\n\n**Market Summary:** ${scoutSummary.market_summary}\n\n## Top Picks\n\n`;

  scoutSummary.jobs.forEach((job) => {
    report += `### ${job.title} @ ${job.company} (${job.location})\n`;
    report += `* **Verdict:** ${job.verdict} ${job.badges.join(' ')}\n`;
    report += `* **Verified Stack:** ${job.tech_stack.join(', ')}\n`;
    report += `* **Cynical Take:** ${job.cynical_take}\n`;
    report += `* **Why it fits:** ${job.why_it_fits}\n`;
    report += `* **Link:** [Apply Here](${job.url})\n\n---\n\n`;
  });

  try {
    const outFile = state.config_output_path || 'result.md';
    await Bun.write(outFile, report);
  } catch (err) {
    await logTrace(LOG_STAGE_SCOUT_ERROR, LOG_MSG_WRITE_FAILED, String(err));
  }

  return {
    messages: [new HumanMessage(report)],
    scout_summary: scoutSummary,
    is_finished: true,
  };
}
