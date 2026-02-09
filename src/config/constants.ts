export const APP = {
  GREETING: '💀 HEADLESS HUNTER',
  QUESTION: 'What kind of job are we hunting today?',
  DEFAULT_QUERY: 'Senior Software Engineer (React/TS). Location: München. Remote',
  REPORT_TITLE: 'RECRUITMENT REPORT:',
  REPORT_EXIT: 'Press Ctrl+C to exit.',
  PROCESSING_STREAM: 'Processing Stream:',
  AGENT_HUNTING: 'AGENT IS HUNTING...',
};

export const UI = {
  TARGET_LOCKED: (query: string) => `🎯 Target locked: "${query}"`,
  USING_RESUME: (path: string) => `Using resume: ${path}`,
  NO_RESUME: '⚠️ No resume selected.',
  RESULT_PATH: (path: string) => `📄 Result will be saved to: ${path}`,
  TRACE_PATH: (path: string) => `📝 Trace log will be saved to: ${path}`,
  INIT: 'Initializing Agentic Workflow...',
  PROFILER_TARGET: (role: string) => `✅ Profiler target: ${role}`,
  STEP_FINISHED: (node: string) => `✅ Step finished: ${node}`,
  MISSION_COMPLETE: '🏁 Mission Complete.',
  ERROR: (msg: string) => `❌ Error: ${msg}`,
};

export const LOG = {
  STAGE_SCOUT_SEARCH: 'SCOUT_SEARCH',
  STAGE_SCOUT_ERROR: 'SCOUT_ERROR',
  MSG_MD_FAILED: '❌ Markdown Generation Failed',
  MSG_WRITE_FAILED: '❌ Failed to write result.md',
  MSG_RAW_CONTENT: 'Raw Content',
  MSG_JSON_ERROR: '❌ JSON Parse Error',
  MSG_VALIDATION_SUCCESS: '✅ Zod Validation Passed',
  MSG_RECOVERY_SUCCESS: '✅ Recovery Validation Passed',
  MSG_VALIDATION_FAILED: '❌ Validation Failed',
  MSG_RECOVERY_FAILED: '❌ Recovery Validation Failed',
  MSG_MODEL_FAILED: '❌ Model Invocation Failed',
};

export const AGENT = {
  PROFILER_STRATEGY: (role: string, location: string) =>
    `Strategy: Hunting for ${role} in ${location}`,
  SCOUT_FOUND_TARGETS: (count: number) => `Scout found ${count} primary targets.`,
  SCOUT_GLOBAL_SEARCH: (count: number) => `Global search returned ${count} potential links.`,
  RESEARCHER_PROCESSED: (url: string) => `Processed ${url}`,
  RESEARCHER_PREFIX_PROCESSED: 'Processed',
  RESEARCHER_SOURCE_HEADER: (url: string, title?: string) =>
    `\n\n--- ${title ? 'HARVESTED ' : ''}SOURCE: ${url}${title ? ` (${title})` : ''} ---\n`,
  HUNTER_SCAN_COMPLETE: 'Scanning complete. Initializing the Hunter for final synthesis...',
};

export const REPORT = {
  HEADER: '# Headless Hunter Report\n\n',
  MARKET_SUMMARY: '**Market Summary:**',
  TOP_PICKS: '## Top Picks\n\n',
  ERROR_SUMMARY: 'Error generating report.',
  ANALYSIS_PENDING: 'Analysis pending',
  NO_DATA: 'No data provided.',
  CHECK_LISTING: 'Check listing for details.',
};

export const STATUS = {
  QUICK_SEARCH: '[Mode]: Quick Search (Scrapers Disabled)',
  FINALIZING: 'FINALIZING REPORT...',
  SEARCH_COUNT: 'Search:',
  SCANS: 'Scans:',
};

export const HUNTER = {
  DEFAULT_POSITION: 'Unknown Position ❓',
  DEFAULT_COMPANY: 'Unknown Company ❓',
  DEFAULT_LOCATION: 'Unknown Location ❓',
};
