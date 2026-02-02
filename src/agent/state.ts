import { ProfilerSummary, ScoutSummary } from '@/types';
import { getNextHuntFilePath } from '@/utils';
import { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),

  user_input_prompt: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => '',
  }),

  user_input_resume: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => '',
  }),

  resume_path: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),

  profiler_summary: Annotation<ProfilerSummary>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({
      role: '',
      keywords: [],
      location: '',
      min_salary: null,
      vibe: '',
    }),
  }),

  scout_summary: Annotation<ScoutSummary>({
    reducer: (_x, y) => y,
    default: () => ({ market_summary: '', jobs: [] }),
  }),

  config_output_path: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => getNextHuntFilePath(),
  }),

  total_jobs: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0,
  }),

  processed_jobs: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0,
  }),

  job_targets: Annotation<string[]>({
    reducer: (_x, y) => y,
    default: () => [],
  }),

  scraped_knowledge: Annotation<string>({
    reducer: (x, y) => x + y,
    default: () => '',
  }),

  successful_scrapes: Annotation<string[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),

  search_results: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => '',
  }),

  is_finished: Annotation<boolean>({
    reducer: (_x, y) => y,
    default: () => false,
  }),

  search_count: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0,
  }),

  config_skip_scraping: Annotation<boolean>({
    reducer: (_x, y) => y,
    default: () => false,
  }),
});

export type AgentStateType = typeof AgentState.State;
