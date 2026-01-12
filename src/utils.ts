import fs from 'fs';
import path from 'path';
import { AIMessageChunk } from '@langchain/core/messages';
import { logTrace } from './logger';
import { ensureString } from './tools';

export async function getParsedModelOutput<T>(
  modelResponse: AIMessageChunk,
  nodeName: string,
  fallbackValue: T
): Promise<T> {
  try {
    const contentStr = ensureString(modelResponse.content);

    await logTrace(nodeName, 'Raw Content', contentStr);

    const cleanJson = contentStr.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(cleanJson) as T;
    } catch (_parseError) {
      await logTrace(`${nodeName}_ERROR`, 'JSON Parse Error', cleanJson);
      return fallbackValue;
    }
  } catch (error) {
    await logTrace(`${nodeName}_ERROR`, 'Model Invocation Failed', String(error));
    return fallbackValue;
  }
}

export function getNextHuntFilePath(outputDir: string = 'result'): string {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Find highest numbered file
    const files = fs.readdirSync(outputDir);
    let maxNum = 0;
    const pattern = /^hunt-(\d+)\.md$/;

    for (const file of files) {
      const match = file.match(pattern);
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
