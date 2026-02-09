import * as modelFactory from '@/llm/model_factory';
import { getParsedModelOutput } from '@/utils';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import { z } from 'zod';

describe('JSON Recovery', () => {
  type TestResult = { recovered: boolean } | { error: boolean };
  const fallback: TestResult = { error: true };
  const schema = z.any();

  // Use spyOn to mock getModel safely without polluting other tests
  const modelSpy = spyOn(modelFactory, 'getModel').mockReturnValue({
    invoke: () => Promise.resolve(new AIMessageChunk('{"recovered": true}')),
  } as unknown as ChatOllama);

  afterAll(() => {
    modelSpy.mockRestore();
  });

  test('should recover truncated JSON using LLM', async () => {
    const input = '{"recovered": tr';
    const msg = new AIMessageChunk(input);

    const result = await getParsedModelOutput<TestResult>(msg, 'TEST', schema, fallback);
    expect(result).toEqual({ recovered: true });
  });
});
