import { describe, test, expect, mock } from 'bun:test';
import { getParsedModelOutput } from '@/utils';
import { AIMessageChunk } from '@langchain/core/messages';
import { AgentNode } from '@/types';

// Mock getModel to return a predictable recovery response
void mock.module('@/llm/model_factory', () => {
  return {
    getModel: (_node: AgentNode) => {
      return {
        invoke: () => Promise.resolve(new AIMessageChunk('{"recovered": true}')),
      };
    },
  };
});

describe('JSON Recovery', () => {
  type TestResult = { recovered: boolean } | { error: boolean };
  const fallback: TestResult = { error: true };

  test('should recover truncated JSON using LLM', async () => {
    const input = '{"recovered": tr';
    const msg = new AIMessageChunk(input);

    const result = await getParsedModelOutput<TestResult>(msg, 'TEST', fallback);
    expect(result).toEqual({ recovered: true });
  });
});
