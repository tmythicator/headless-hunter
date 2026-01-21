export interface ProfilerSummary {
  role: string;
  keywords: string[];
  location: string;
  country?: string;
  min_salary: number | null;
  vibe: string;
}

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
  ANALYST = 'analyst',
  REPORTER = 'reporter',
  RECOVERY = 'recovery',
}

export enum ProviderType {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export enum WorkflowPhase {
  RESUME_SELECTION = 'resume_selection',
  INPUT = 'input',
  WORKING = 'working',
  DONE = 'done',
}

export enum Verdict {
  STRONG_MATCH = 'Strong Match',
  WEAK_MATCH = 'Weak Match',
  INTERESTING_GAMBLE = 'Interesting Gamble',
}

export interface JobMatch {
  title: string;
  company: string;
  location: string;
  verdict: Verdict;
  badges: string[];
  tech_stack: string[];
  cynical_take: string;
  why_it_fits: string;
  url: string;
}

export interface ScoutSummary {
  market_summary: string;
  jobs: JobMatch[];
}
