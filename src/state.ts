import { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';
import { ProfilerSummary, ScoutSummary } from './types';
import { getNextHuntFilePath } from './utils';

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
});

export type AgentStateType = typeof AgentState.State;
