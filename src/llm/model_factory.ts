import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ProviderType, AgentNode, ModelConfig } from '@/types';

const DEFAULT_OLLAMA_BASE = 'http://localhost:11434';

const DEFAULT_MODELS: Record<ProviderType, string> = {
  [ProviderType.LOCAL]: 'ministral-3:14b',
  [ProviderType.GOOGLE]: 'gemini-2.5-flash-lite',
};

function getMaxOutputTokens(node: AgentNode): number {
  // Scout reports are long, so we need more tokens
  return node === AgentNode.SCOUT ? 8192 : 4096;
}

function getModelConfig(node: AgentNode): ModelConfig {
  const role = node.toUpperCase();

  const providerEnv = process.env[`LLM_PROVIDER_${role}`] ?? process.env.LLM_PROVIDER;
  let provider = ProviderType.LOCAL;
  if (providerEnv && Object.values(ProviderType).includes(providerEnv as ProviderType)) {
    provider = providerEnv as ProviderType;
  }

  let modelName = '';
  if (provider === ProviderType.GOOGLE) {
    modelName =
      process.env[`GOOGLE_MODEL_${role}`] ??
      process.env.GOOGLE_MODEL ??
      DEFAULT_MODELS[ProviderType.GOOGLE];
  } else {
    modelName =
      process.env[`OLLAMA_MODEL_${role}`] ??
      process.env.OLLAMA_MODEL ??
      DEFAULT_MODELS[ProviderType.LOCAL];
  }

  return { provider, modelName };
}

export function getModel(node: AgentNode) {
  const config = getModelConfig(node);
  const maxOutputTokens = getMaxOutputTokens(node);

  if (config.provider === ProviderType.GOOGLE) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(
        `CRITICAL: LLM_PROVIDER is ${config.provider} but GOOGLE_API_KEY is missing.`
      );
    }
    return new ChatGoogleGenerativeAI({
      modelName: config.modelName,
      temperature: 0,
      maxOutputTokens: maxOutputTokens,
    });
  }

  return new ChatOllama({
    model: config.modelName,
    temperature: 0,
    baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE,
    numPredict: maxOutputTokens,
  });
}

export function getModelInfo() {
  return {
    profiler: getModelConfig(AgentNode.PROFILER),
    scout: getModelConfig(AgentNode.SCOUT),
  };
}
