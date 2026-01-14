import { AsyncLocalStorage } from 'async_hooks';
import { exists, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const logContext = new AsyncLocalStorage<string>();

let initializedLogPath: string | null = null;

async function getTestLogPath(): Promise<string> {
  if (initializedLogPath) return initializedLogPath;

  const logDir = 'tests/log';
  try {
    if (!(await exists(logDir))) {
      await mkdir(logDir, { recursive: true });
    }

    const files = await readdir(logDir);
    const logFiles = files.filter((f) => f.startsWith('test-log-') && f.endsWith('.log'));

    let maxNum = 0;
    for (const file of logFiles) {
      const match = /test-log-(\d+)\.log/.exec(file);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextNum = String(maxNum + 1).padStart(3, '0');
    initializedLogPath = join(logDir, `test-log-${nextNum}.log`);
  } catch (e) {
    console.error('Failed to initialize test log path:', e);
    initializedLogPath = 'trace.log'; // Fallback
  }
  return initializedLogPath;
}

export function runWithLogPath<T>(logPath: string, fn: () => T): T {
  return logContext.run(logPath, fn);
}

export async function logTrace(stage: string, input: string, output: string, error?: string) {
  const isTest =
    process.env.NODE_ENV === 'test' || (typeof Bun !== 'undefined' && Bun.env.NODE_ENV === 'test');

  let logFile = logContext.getStore();

  if (!logFile && isTest) {
    logFile = await getTestLogPath();
  }

  if (!logFile && !isTest) {
    return;
  }

  logFile ??= 'trace.log';

  const timestamp = new Date().toISOString();

  let formattedInput = input;
  let formattedOutput = output;

  // Try to pretty print JSON if applicable
  try {
    if (input.startsWith('{') || input.startsWith('[')) {
      formattedInput = JSON.stringify(JSON.parse(input), null, 2);
    }
  } catch {
    // ignore
  }

  try {
    if (output.startsWith('{') || output.startsWith('[')) {
      formattedOutput = JSON.stringify(JSON.parse(output), null, 2);
    }
  } catch {
    // ignore
  }

  const errSection = error ? `\nERROR: ${error}\n` : '';

  const entry = `[${timestamp}] ${stage}
IN:  ${formattedInput}
OUT: ${formattedOutput}
${errSection}--------------------------------------------------
`;

  try {
    const exists = await Bun.file(logFile).exists();
    const content = exists ? await Bun.file(logFile).text() : '';

    await Bun.write(logFile, content + entry);
  } catch (e) {
    console.error('Tracing failed:', e);
  }
}
