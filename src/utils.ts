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
