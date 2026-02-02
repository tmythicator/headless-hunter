import * as modelFactory from '@/llm/model_factory';
import { getParsedModelOutput } from '@/utils';
import { AIMessageChunk } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { afterAll, describe, expect, spyOn, test } from 'bun:test';

describe('Utils: getParsedModelOutput', () => {
  type TestResult = { key: string } | { id: number }[] | { error: boolean };
  const fallback: TestResult = { error: true };

  const modelSpy = spyOn(modelFactory, 'getModel').mockReturnValue({
    invoke: () => Promise.reject(new Error('UnitTest: Recovery Model Failure')),
  } as unknown as ChatOllama);

  afterAll(() => {
    modelSpy.mockRestore();
  });

  test('should extract pure JSON', async () => {
    const input = '{"key": "value"}';
    const msg = new AIMessageChunk(input);
    const result = await getParsedModelOutput<TestResult>(msg, 'TEST', fallback);
    expect(result).toEqual({ key: 'value' });
  });

  test('should extract JSON from markdown block', async () => {
    const input = '```json\n{"key": "value"}\n```';
    const msg = new AIMessageChunk(input);
    const result = await getParsedModelOutput<TestResult>(msg, 'TEST', fallback);
    expect(result).toEqual({ key: 'value' });
  });

  test('should extract JSON mixed with text', async () => {
    const input = 'Here is the JSON:\n{"key": "value"}\nHope this helps.';
    const msg = new AIMessageChunk(input);
    const result = await getParsedModelOutput<TestResult>(msg, 'TEST', fallback);
    expect(result).toEqual({ key: 'value' });
  });

  test('should extract Array JSON mixed with text', async () => {
    const input = 'Sure, here is the list:\n[\n  {"id": 1}\n]\nEnjoy.';
    const msg = new AIMessageChunk(input);
    const result = await getParsedModelOutput<TestResult>(msg, 'TEST', fallback);
    expect(result).toEqual([{ id: 1 }]);
  });

  test('should fallback on invalid JSON', async () => {
    const input = 'This is not JSON.';
    const msg = new AIMessageChunk(input);
    const result = await getParsedModelOutput<TestResult>(msg, 'TEST', fallback);
    expect(result).toEqual(fallback);
  });

  test('should extract JSON even with sloppy formatting', async () => {
    // Missing closing markdown, extra newlines
    const input = 'Okay:\n\n```json\n{"key": "value"}\n\n';
    const msg = new AIMessageChunk(input);
    const result = await getParsedModelOutput<TestResult>(msg, 'TEST', fallback);
    expect(result).toEqual({ key: 'value' });
  });
});
