import { describe, expect, test, spyOn, afterAll } from 'bun:test';
import { scoutNode } from '../../src/agent/nodes';
import { ScoutSummary } from '../../src/types';
import * as tools from '../../src/tools';
import { join } from 'path';
import mockTavilyResults from '../fixtures/tavily_search_results.json';

describe('Ollama Integration (Scout Node)', () => {
  const TIMEOUT = 240000;
  const searchSpy = spyOn(tools, 'searchJobsInDach').mockResolvedValue(mockTavilyResults);
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
      };

      const result = await scoutNode(mockState);
      const summary = result.scout_summary as unknown as ScoutSummary; // Cast for testing

      expect(result.messages).toHaveLength(1);
      expect(summary.jobs.length).toBeGreaterThan(0);
      expect(summary.market_summary).toBeTruthy();

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
