import { HuntSummarySchema, JobMatchSchema, ProfilerSummarySchema } from '@/llm/schemas';
import { z } from 'zod';

export type ProfilerSummary = z.infer<typeof ProfilerSummarySchema>;

export interface TavilySearchResult {
  url: string;
  title: string;
  content?: string | null;
  raw_content?: string | null;
  score?: number;
  published_date?: string;
}

export interface ModelConfig {
  provider: ProviderType;
  modelName: string;
}

export enum AgentNode {
  PROFILER = 'profiler',
  SCOUT = 'scout',
  RESEARCHER = 'researcher',
  HUNTER = 'hunter',
  RECOVERY = 'recovery',
}

export enum ProviderType {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export enum WorkflowPhase {
  RESUME_SELECTION = 'resume_selection',
  MODE_SELECTION = 'mode_selection',
  INPUT = 'input',
  WORKING = 'working',
  DONE = 'done',
}

export enum Verdict {
  STRONG_MATCH = 'Strong Match',
  WEAK_MATCH = 'Weak Match',
  INTERESTING_GAMBLE = 'Interesting Gamble',
}

export type JobMatch = z.infer<typeof JobMatchSchema>;

export type HuntSummary = z.infer<typeof HuntSummarySchema>;
