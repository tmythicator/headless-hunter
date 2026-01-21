import fs from 'fs';
import path from 'path';
import { AIMessageChunk, HumanMessage } from '@langchain/core/messages';
import { logTrace } from './logger';
import { ensureString } from '@/tools';
import { LOG_MSG_RAW_CONTENT, LOG_MSG_JSON_ERROR } from '@/config/constants';
import { getModel } from '@/llm/model_factory';
import { AgentNode } from '@/types';

async function fixMalformedJson<T>(jsonCarcass: string, error: unknown): Promise<T | null> {
  try {
    const recoveryModel = getModel(AgentNode.RECOVERY);
    const prompt = `
    You are a JSON repair expert.
    I have a malformed/truncated JSON string.
    Your task:
    1. Identify the cut-off point.
    2. Auto-complete the structure (close objects/arrays) to make it valid.
    3. Return ONLY the valid JSON.

    MALFORMED JSON:
    ${jsonCarcass}

    ERROR:
    ${String(error)}
    `;

    const response = await recoveryModel.invoke([new HumanMessage(prompt)]);
    const fixedStr = ensureString(response.content);
    // Extract JSON block if present
    const jsonBlock = /```json([\s\S]*?)```/.exec(fixedStr);
    const cleanJson = jsonBlock ? jsonBlock[1].trim() : fixedStr;
    return JSON.parse(cleanJson) as T;
  } catch (_e) {
    return null;
  }
}

function extractJsonCandidate(content: string): string {
  // 1. Try extracting from markdown code blocks first
  const jsonBlock = /```json([\s\S]*?)```/.exec(content);
  if (jsonBlock) {
    return jsonBlock[1].trim();
  }

  // 2. Fallback: Find outermost JSON-like structure
  const firstOpen = content.search(/[{[]/);
  // Match the last closing brace/bracket that isn't followed by another closing brace/bracket
  const lastClose = content.search(/[}\]][^}\]]*$/);

  if (firstOpen !== -1 && lastClose !== -1) {
    return content.slice(firstOpen, lastClose + 1);
  }

  return content;
}

function cleanJsonString(jsonCandidate: string): string {
  // 1. Strip comments while respecting strings
  // - ("(?:\\.|[^\\"])*"): Match double-quoted strings (ignoring escaped quotes) -> keep group1
  // - \/\*[\s\S]*?\*\/ : Match block comments /* ... */ -> replace with empty
  // - \/\/.* : Match line comments // ... -> replace with empty
  let fixed = jsonCandidate.replace(
    /("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g,
    (_match, group1: string | undefined) => group1 ?? ''
  );

  // 2. Strip trailing commas before closing braces/brackets
  // Regex: Match a comma followed by whitespace and a closing brace/bracket
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  return fixed;
}

export async function getParsedModelOutput<T>(
  modelResponse: AIMessageChunk,
  nodeName: string,
  fallbackValue: T
): Promise<T> {
  const contentStr = ensureString(modelResponse.content);
  await logTrace(nodeName, LOG_MSG_RAW_CONTENT, contentStr);

  const cleanJson = extractJsonCandidate(contentStr);
  const finalJsonString = cleanJsonString(cleanJson);

  try {
    return JSON.parse(finalJsonString) as T;
  } catch (error) {
    await logTrace(
      `${nodeName}_ERROR`,
      LOG_MSG_JSON_ERROR,
      `Failed to parse: ${cleanJson.substring(0, 512)}... (Error: ${String(error)})`
    );

    // Attempt Recovery
    const recovered = await fixMalformedJson<T>(cleanJson, error);
    if (recovered) {
      await logTrace(
        `${nodeName}_RECOVERY`,
        'JSON Recovery',
        'Successfully recovered JSON via LLM'
      );
      return recovered;
    }

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

  const logBase = base.startsWith('hunt-') ? base.replace('hunt-', 'hunt-log-') : `${base}-log`;

  return path.join(dir, `${logBase}.log`);
}
