import fs from 'fs';
import path from 'path';
import { AIMessageChunk } from '@langchain/core/messages';
import { logTrace } from './logger';
import { ensureString } from '@/tools';
import { LOG_MSG_RAW_CONTENT, LOG_MSG_JSON_ERROR } from '@/config/constants';

export async function getParsedModelOutput<T>(
  modelResponse: AIMessageChunk,
  nodeName: string,
  fallbackValue: T
): Promise<T> {
  const contentStr = ensureString(modelResponse.content);
  await logTrace(nodeName, LOG_MSG_RAW_CONTENT, contentStr);

  let cleanJson = contentStr;

  try {
    // 1. Try extracting from markdown code blocks first
    const jsonBlock = /```json([\s\S]*?)```/.exec(contentStr);
    if (jsonBlock) {
      cleanJson = jsonBlock[1].trim();
    } else {
      // 2. Fallback: Find outermost JSON-like structure
      const firstOpen = contentStr.search(/[{[]/);
      const lastClose = contentStr.search(/[}\]][^}\]]*$/);
      if (firstOpen !== -1 && lastClose !== -1) {
        cleanJson = contentStr.slice(firstOpen, lastClose + 1);
      }
    }

    // 3. Attempt to fix common LLM JSON errors (trailing commas and comments)
    // Strip comments while respecting strings (don't break URLs like https://)
    let fixedJson = cleanJson.replace(
      /("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g,
      (match, group1: string | undefined) => group1 ?? ''
    );

    // Strip trailing commas
    fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');

    return JSON.parse(fixedJson) as T;
  } catch (error) {
    await logTrace(
      `${nodeName}_ERROR`,
      LOG_MSG_JSON_ERROR,
      `Failed to parse: ${cleanJson.substring(0, 200)}... (Error: ${String(error)})`
    );
    return fallbackValue;
  }
}

export function getNextHuntFilePath(outputDir = 'result'): string {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Find highest numbered file
    const files = fs.readdirSync(outputDir);
    let maxNum = 0;
    const pattern = /^hunt-(\d+)\.md$/;

    for (const file of files) {
      const match = pattern.exec(file);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    const nextNum = maxNum + 1;
    const paddedNum = nextNum.toString().padStart(3, '0');
    return path.join(outputDir, `hunt-${paddedNum}.md`);
  } catch (error) {
    console.error('Error generating file path:', error);
    return path.join(outputDir, 'hunt-fallback.md');
  }
}

export function getLogFilePath(resultFilePath: string): string {
  if (!resultFilePath) return 'trace.log';
  const dir = path.dirname(resultFilePath);
  const base = path.basename(resultFilePath, '.md');

  // Expected format: hunt-001.md -> hunt-log-001.log
  // If base is 'hunt-001', we want 'hunt-log-001.log'
  const logBase = base.startsWith('hunt-') ? base.replace('hunt-', 'hunt-log-') : `${base}-log`;

  return path.join(dir, `${logBase}.log`);
}
