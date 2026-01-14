import { describe, expect, test, spyOn, afterAll } from 'bun:test';
import { scoutNode, analystNode, reporterNode } from '@/agent/nodes';
import { ScoutSummary, TavilySearchResult } from '@/types';
import * as tools from '@/tools';
import { join } from 'path';
import mockTavilyResults from '../fixtures/tavily_search_results.json';

describe('Ollama Integration (Scout Node)', () => {
  const TIMEOUT = 240000;

  const searchSpy = spyOn(tools, 'searchJobsInDach').mockResolvedValue(
    mockTavilyResults.results as unknown as TavilySearchResult[]
  );
  const outputFile = 'tests/integration/ollama_test_result.md';

  afterAll(() => {
    searchSpy.mockRestore();
  });

  test(
    'scoutNode should generate a cynical analysis using Ollama and write test_result.md',
    async () => {
      const resumePath = join(import.meta.dir, '../fixtures/resume_example.md');
      const resumeContent = await Bun.file(resumePath).text();

      const mockState = {
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
        scout_summary: { market_summary: '', jobs: [] },
        total_jobs: 0,
        processed_jobs: 0,
        job_targets: [],
        scraped_knowledge: '',
        successful_scrapes: [],
        search_results: '',
        is_finished: false,
        search_count: 0,
      };

      // 1. Test scoutNode (discovery)
      const scoutResult = await scoutNode(mockState);
      expect(scoutResult.job_targets.length).toBeGreaterThan(0);
      expect(scoutResult.total_jobs).toBeGreaterThan(0);
      expect(scoutResult.search_count).toBeGreaterThan(0);

      // 2. Test analystNode (simple processing)
      const analystState = {
        ...mockState,
        ...scoutResult,
      };
      const analystResult = await analystNode(analystState);
      expect(analystResult.processed_jobs).toBe(1);
      expect(analystResult.job_targets).toHaveLength(scoutResult.job_targets.length - 1);

      // 3. Test reporterNode (reporting)
      const reporterState = {
        ...analystState,
        ...analystResult,
        job_targets: [], // Simulate finishing processing
        scraped_knowledge: 'Dummy knowledge for report generation',
        search_results: JSON.stringify(mockTavilyResults.results, null, 2),
      };

      const reporterResult = await reporterNode(reporterState);
      const summary = reporterResult.scout_summary as unknown as ScoutSummary;

      expect(reporterResult.messages).toHaveLength(1);
      expect(summary.jobs.length).toBeGreaterThan(0);
      expect(summary.market_summary).toBeTruthy();
      expect(reporterResult.is_finished).toBe(true);

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
