export const APP_GREETING = '💀 HEADLESS HUNTER';
export const APP_QUESTION = 'What kind of job are we hunting today?';
export const APP_DEFAULT_QUERY = 'Senior Software Engineer (React/TS). Location: München. Remote';
export const APP_REPORT_TITLE = '📄 RECRUITMENT REPORT:';
export const APP_REPORT_EXIT = 'Press Ctrl+C to exit.';
export const APP_PROCESSING_STREAM = 'Processing Stream:';
export const APP_AGENT_HUNTING = 'AGENT IS HUNTING...';

// UI Messages (Displayed in Terminal)
export const UI_TARGET_LOCKED = (query: string) => `🎯 Target locked: "${query}"`;
export const UI_USING_RESUME = (path: string) => `📄 Using resume: ${path}`;
export const UI_NO_RESUME = '⚠️ No resume selected.';
export const UI_RESULT_PATH = (path: string) => `📄 Result will be saved to: ${path}`;
export const UI_TRACE_PATH = (path: string) => `📝 Trace log will be saved to: ${path}`;
export const UI_INIT = '🚀 Initializing Agentic Workflow...';
export const UI_PROFILER_TARGET = (role: string) => `✅ Profiler target: ${role}`;
export const UI_STEP_FINISHED = (node: string) => `✅ Step finished: ${node}`;
export const UI_MISSION_COMPLETE = '🏁 Mission Complete.';
export const UI_ERROR = (msg: string) => `❌ Error: ${msg}`;

// Internal Log Tracing Constants
export const LOG_STAGE_SCOUT_SEARCH = 'SCOUT_SEARCH';
export const LOG_STAGE_SCOUT_ERROR = 'SCOUT_ERROR';
export const LOG_MSG_MD_FAILED = 'Markdown Generation Failed';
export const LOG_MSG_WRITE_FAILED = 'Failed to write result.md';
export const LOG_MSG_RAW_CONTENT = 'Raw Content';
export const LOG_MSG_JSON_ERROR = 'JSON Parse Error';
export const LOG_MSG_MODEL_FAILED = 'Model Invocation Failed';
