import { hunterNode, researcherNode, scoutNode } from '@/agent/nodes';
import { AgentStateType } from '@/agent/state';
import * as tools from '@/tools';
import { HuntSummary, TavilySearchResult } from '@/types';
import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import { join } from 'path';
import mockTavilyResults from '../fixtures/tavily_search_results.json';

describe('Ollama Integration (Scout Node)', () => {
  const TIMEOUT = 240000;

  const searchSpy = spyOn(tools, 'searchJobsInDach').mockResolvedValue(
    mockTavilyResults.results as unknown as TavilySearchResult[]
  );
  const scrapeSpy = spyOn(tools, 'scrapeContentLocal').mockResolvedValue('Mock Content');
  const harvestSpy = spyOn(tools, 'harvestLinksFromPage').mockResolvedValue([]);

  const outputFile = 'tests/integration/ollama_test_result.md';

  afterAll(() => {
    searchSpy.mockRestore();
    scrapeSpy.mockRestore();
    harvestSpy.mockRestore();
  });

  test(
    'Workflow should generate a cynical analysis using Ollama and write test_result.md',
    async () => {
      const resumePath = join(import.meta.dir, '../fixtures/resume_example.md');
      const resumeContent = await Bun.file(resumePath).text();

      const mockState: AgentStateType = {
        messages: [],
        user_input_prompt: 'Senior Fullstack Engineer in Berlin',
        profiler_summary: {
          role: 'Senior Fullstack Engineer',
          keywords: ['React', 'TypeScript', 'Go'],
          location: 'Berlin',
          country: 'Germany',
          min_salary: 80000,
          vibe: 'Corporate',
        },
        user_input_resume: resumeContent,
        resume_path: null,
        config_output_path: outputFile,
        hunt_summary: { market_summary: '', jobs: [] },
        total_jobs: 0,
        processed_jobs: 0,
        job_targets: [],
        scraped_knowledge: '',
        successful_scrapes: [],
        search_results: '',
        is_finished: false,
        search_count: 0,
        config_skip_scraping: false,
      };

      // 1. Test scoutNode (discovery)
      const scoutResult = await scoutNode(mockState);
      expect(scoutResult.job_targets.length).toBeGreaterThan(0);
      expect(scoutResult.total_jobs).toBeGreaterThan(0);
      expect(scoutResult.search_count).toBeGreaterThan(0);

      // 2. Test researcherNode (simple processing)
      const researcherState: AgentStateType = {
        ...mockState,
        ...scoutResult,
      };
      const researcherResult = await researcherNode(researcherState);
      expect(researcherResult.processed_jobs).toBe(1);
      expect(researcherResult.job_targets).toHaveLength(scoutResult.job_targets.length - 1);

      const mockJob = mockTavilyResults.results[0];
      const jobUrl = mockJob.url;

      // 3. Test hunterNode (reporting)
      const hunterState: AgentStateType = {
        ...researcherState,
        ...researcherResult,
        job_targets: [],
        scraped_knowledge: `
          --- SOURCE: ${jobUrl} ---
          ${mockJob.content}
        `,
        successful_scrapes: [jobUrl],
        search_results: JSON.stringify(mockTavilyResults.results, null, 2),
      };

      const hunterResult = await hunterNode(hunterState);
      const summary = hunterResult.hunt_summary as unknown as HuntSummary;

      expect(hunterResult.messages).toHaveLength(1);
      expect(summary.jobs.length).toBeGreaterThan(0);
      expect(summary.market_summary).toBeTruthy();
      expect(hunterResult.is_finished).toBe(true);

      const file = Bun.file(outputFile);
      expect(await file.exists()).toBe(true);
      const content = await file.text();
      expect(content).toContain('# Headless Hunter Report');

      expect(content).toContain('Verdict:');
      expect(content).toMatch(/\[Verified Live\]|\[Search Snippet Only\]/);

      expect(searchSpy).toHaveBeenCalled();
    },
    TIMEOUT
  );
});
