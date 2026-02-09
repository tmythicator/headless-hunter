import { z } from 'zod';

export const ProfilerSummarySchema = z.object({
  role: z.string().describe('Job Title (e.g. Fullstack Engineer)'),
  keywords: z.array(z.string()).describe('Tech stack keywords like "React", "Go", "TypeScript"'),
  location: z.string().describe('City/Region'),
  country: z.string().optional().describe('Country Name'),
  min_salary: z.number().nullable().describe('Minimum salary expectation or null'),
  vibe: z.string().describe('Company vibe preference (Startup, Corporate, etc)'),
});

export const VerdictSchema = z.enum(['Strong Match', 'Weak Match', 'Interesting Gamble']);

export const JobMatchSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  verdict: VerdictSchema,
  badges: z.array(z.string()),
  tech_stack: z.array(z.string()),
  cynical_take: z.string().describe('Max 2 sentences cynicism'),
  why_it_fits: z.string().describe('Max 2 sentences explanation'),
  url: z.string(),
});

export const HuntSummarySchema = z.object({
  market_summary: z.string().describe('Concise 2-3 sentence summary of the market'),
  jobs: z.array(JobMatchSchema).describe('List of up to 7 best fit jobs'),
});
