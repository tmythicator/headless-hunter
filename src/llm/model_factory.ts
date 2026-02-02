import { AgentNode, ModelConfig, ProviderType } from '@/types';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';

const DEFAULT_OLLAMA_BASE = 'http://localhost:11434';

const DEFAULT_MODELS: Record<ProviderType, string> = {
  [ProviderType.LOCAL]: 'ministral-3:14b',
  [ProviderType.GOOGLE]: 'gemini-2.5-flash-lite',
};

function getModelConfig(node: AgentNode): ModelConfig {
  const role = node.toUpperCase();
  const provider = (process.env[`LLM_PROVIDER_${role}`] ??
    process.env.LLM_PROVIDER) as ProviderType;

  const isGoogle = provider === ProviderType.GOOGLE;
  const modelName = isGoogle
    ? (process.env[`GOOGLE_MODEL_${role}`] ??
      process.env.GOOGLE_MODEL ??
      DEFAULT_MODELS[ProviderType.GOOGLE])
    : (process.env[`OLLAMA_MODEL_${role}`] ??
      process.env.OLLAMA_MODEL ??
      DEFAULT_MODELS[ProviderType.LOCAL]);

  return {
    provider: provider ?? ProviderType.LOCAL,
    modelName,
  };
}

export function getModel(node: AgentNode) {
  const { provider, modelName } = getModelConfig(node);
  const maxOutputTokens = node === AgentNode.SCOUT ? 8192 : 4096;

  if (provider === ProviderType.GOOGLE) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(`CRITICAL: GOOGLE_API_KEY missing for ${provider}`);
    }
    return new ChatGoogleGenerativeAI({
      modelName,
      temperature: 0,
      maxOutputTokens,
    });
  }

  return new ChatOllama({
    model: modelName,
    temperature: 0,
    baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE,
    numPredict: maxOutputTokens,
  });
}

export function getModelInfo() {
  return {
    profiler: getModelConfig(AgentNode.PROFILER),
    scout: getModelConfig(AgentNode.SCOUT),
    researcher: getModelConfig(AgentNode.RESEARCHER),
    hunter: getModelConfig(AgentNode.HUNTER),
  };
}
