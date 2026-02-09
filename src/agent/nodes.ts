import { AGENT, HUNTER, LOG, REPORT } from '@/config/constants';
import { getModel } from '@/llm/model_factory';
import { createHunterPrompt, createProfilerPrompt } from '@/llm/prompts';
import { harvestLinksFromPage, scrapeContentLocal, searchJobsInDach } from '@/tools';
import { loadResume } from '@/tools/resume_loader';
import { AgentNode, HuntSummary, ProfilerSummary, TavilySearchResult } from '@/types';
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
    messages: [new HumanMessage(AGENT.PROFILER_STRATEGY(prefs.role, prefs.location))],
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
  await logTrace(LOG.STAGE_SCOUT_SEARCH, query, JSON.stringify(searchResults, null, 2));

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
    messages: [new HumanMessage(AGENT.SCOUT_FOUND_TARGETS(targets.size))],
  };
}

export async function researcherNode(state: AgentStateType) {
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
        newKnowledge += AGENT.RESEARCHER_SOURCE_HEADER(job.url, job.title) + content + '\n';
        newScrapes.push(job.url);
      }
    }
  } else {
    const content = await scrapeContentLocal(url);
    if (content.length > 100) {
      newKnowledge += AGENT.RESEARCHER_SOURCE_HEADER(url) + content;
      newScrapes.push(url);
    }
  }

  return {
    job_targets: remainingTargets,
    processed_jobs: state.processed_jobs + 1,
    scraped_knowledge: newKnowledge,
    successful_scrapes: newScrapes,
    messages: [new HumanMessage(AGENT.RESEARCHER_PROCESSED(url))],
  };
}

export async function hunterNode(state: AgentStateType) {
  const model = getModel(AgentNode.HUNTER);
  const prompt = createHunterPrompt(
    state.profiler_summary,
    state.user_input_resume,
    state.search_results,
    state.scraped_knowledge,
    state.search_results,
    state.successful_scrapes.join('\n')
  );

  const response = await model.invoke([new HumanMessage(prompt)]);
  const huntSummaryResult = await getParsedModelOutput<HuntSummary>(response, AgentNode.HUNTER, {
    market_summary: REPORT.ERROR_SUMMARY,
    jobs: [],
  });

  const huntSummary = {
    market_summary: huntSummaryResult.market_summary ?? REPORT.ERROR_SUMMARY,
    jobs: huntSummaryResult.jobs ?? [],
  };

  let report =
    REPORT.HEADER + REPORT.MARKET_SUMMARY + ` ${huntSummary.market_summary}\n\n` + REPORT.TOP_PICKS;

  huntSummary.jobs.forEach((job) => {
    const title = job.title ?? HUNTER.DEFAULT_POSITION;
    const company = job.company ?? HUNTER.DEFAULT_COMPANY;
    const location = job.location ?? HUNTER.DEFAULT_LOCATION;
    const badges = Array.isArray(job.badges) ? job.badges : [];
    const techStack = Array.isArray(job.tech_stack) ? job.tech_stack : [];

    report += `### ${title} @ ${company} (${location})\n`;
    report += `* **Verdict:** ${job.verdict ?? REPORT.ANALYSIS_PENDING} ${badges.join(' ')}\n`;
    report += `* **Verified Stack:** ${techStack.join(', ')}\n`;
    report += `* **Cynical Take:** ${job.cynical_take ?? REPORT.NO_DATA}\n`;
    report += `* **Why it fits:** ${job.why_it_fits ?? REPORT.CHECK_LISTING}\n`;
    report += `* **Link:** ${REPORT.APPLY_LINK}(${job.url ?? '#'})\n\n---\n\n`;
  });

  try {
    const outFile = state.config_output_path || 'result.md';
    await Bun.write(outFile, report);
  } catch (err) {
    await logTrace(LOG.STAGE_SCOUT_ERROR, LOG.MSG_WRITE_FAILED, String(err));
  }

  return {
    messages: [new HumanMessage(report)],
    hunt_summary: huntSummary,
    is_finished: true,
  };
}
