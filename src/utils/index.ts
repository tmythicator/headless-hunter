import { LOG } from '@/config/constants';
import { getModel } from '@/llm/model_factory';
import { createRecoveryPrompt } from '@/llm/prompts';
import { ensureString } from '@/tools';
import { AgentNode } from '@/types';
import { AIMessageChunk, HumanMessage } from '@langchain/core/messages';
import fs from 'fs';
import path from 'path';
import { ZodType } from 'zod';
import { logTrace } from './logger';

async function fixMalformedJson<T>(json: string, error: unknown): Promise<T | null> {
  try {
    const model = getModel(AgentNode.RECOVERY);
    const prompt = createRecoveryPrompt(json, error);

    const response = await model.invoke([new HumanMessage(prompt)]);
    const str = ensureString(response.content);
    const match = /```json([\s\S]*?)```/.exec(str);
    return JSON.parse(match ? match[1].trim() : str) as T;
  } catch {
    return null;
  }
}

function extractJsonCandidate(content: string): string {
  const jsonBlock = /```json([\s\S]*?)```/.exec(content);
  if (jsonBlock) return jsonBlock[1].trim();

  const firstOpen = content.search(/[{[]/);
  const lastClose = content.search(/[}\]][^}\]]*$/);
  return firstOpen !== -1 && lastClose !== -1 ? content.slice(firstOpen, lastClose + 1) : content;
}

/**
 * Sanitizes a JSON string by removing comments and fixing trailing commas.
 * This ensures raw LLM outputs are compatible with standard JSON.parse().
 */
function cleanJsonString(json: string): string {
  return (
    json
      // Remove // and /* */ comments while preserving strings
      .replace(
        /("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g,
        (_match: string, group1: string | undefined) => group1 ?? ''
      )
      // Remove trailing commas before } or ]
      .replace(/,(\s*[}\]])/g, '$1')
  );
}

export async function getParsedModelOutput<T>(
  response: AIMessageChunk,
  nodeName: string,
  schema: ZodType<T>,
  fallbackValue: T
): Promise<T> {
  const content = ensureString(response.content);
  await logTrace(nodeName, LOG.MSG_RAW_CONTENT, content);

  const cleanJson = cleanJsonString(extractJsonCandidate(content));

  try {
    const parsed: unknown = JSON.parse(cleanJson);
    const validated = schema.parse(parsed);
    await logTrace(`${nodeName}_VALIDATION`, 'schema_check', LOG.MSG_VALIDATION_SUCCESS);
    return validated;
  } catch (error) {
    await logTrace(
      `${nodeName}_ERROR`,
      LOG.MSG_JSON_ERROR,
      `${LOG.MSG_VALIDATION_FAILED}: ${cleanJson.slice(0, 100)}... Error: ${String(error)}`
    );
    const recovered = await fixMalformedJson<T>(cleanJson, error);
    if (recovered) {
      try {
        const validatedRecovered = schema.parse(recovered);
        await logTrace(
          `${nodeName}_RECOVERY`,
          LOG.MSG_RECOVERY_SUCCESS,
          JSON.stringify(validatedRecovered)
        );
        return validatedRecovered;
      } catch (validationError) {
        await logTrace(
          `${nodeName}_RECOVERY_FAIL`,
          LOG.MSG_JSON_ERROR,
          `${LOG.MSG_RECOVERY_FAILED}: ${String(validationError)}`
        );
      }
    }
    return fallbackValue;
  }
}

export function getNextHuntFilePath(outputDir = 'result'): string {
  try {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const files = fs.readdirSync(outputDir);
    const nums = files
      .map((f) => /^hunt-(\d+)\.md$/.exec(f))
      .filter((m) => m !== null)
      .map((m) => parseInt(m[1], 10));

    const nextNum = (nums.length ? Math.max(...nums) : 0) + 1;
    return path.join(outputDir, `hunt-${nextNum.toString().padStart(3, '0')}.md`);
  } catch {
    return path.join(outputDir, 'hunt-fallback.md');
  }
}

export function getLogFilePath(resPath: string): string {
  if (!resPath) return 'trace.log';
  const dir = path.dirname(resPath);
  const base = path.basename(resPath, '.md');
  const logBase = base.startsWith('hunt-') ? base.replace('hunt-', 'hunt-log-') : `${base}-log`;
  return path.join(dir, `${logBase}.log`);
}
