import { AsyncLocalStorage } from 'async_hooks';

const logContext = new AsyncLocalStorage<string>();

export function runWithLogPath<T>(logPath: string, fn: () => T): T {
  return logContext.run(logPath, fn);
}

export async function logTrace(stage: string, input: string, output: string, error?: string) {
  const timestamp = new Date().toISOString();
  const errStr = error ? `\nERROR:\n${error}\n` : '';
  const entry = `\n--- [${timestamp}] ${stage} ---\nIN:\n${input}\n\nOUT:\n${output}\n${errStr}---------------------------\n`;
  try {
    const logFile = logContext.getStore() ?? 'trace.log';
    const fileContent = await (async () => {
      try {
        return await Bun.file(logFile).text();
      } catch {
        return '';
      }
    })();
    await Bun.write(logFile, fileContent + entry);
  } catch (e) {
    console.error('Tracing failed:', e);
  }
}
