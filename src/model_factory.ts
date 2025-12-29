import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export enum ModelRole {
  PROFILER = 'PROFILER',
  SCOUT = 'SCOUT'
}

export enum ProviderType {
  LOCAL = 'local',
  GOOGLE = 'google'
}

const DEFAULT_OLLAMA_BASE = "http://localhost:11434";

const DEFAULT_MODELS: Record<ProviderType, string> = {
  [ProviderType.LOCAL]: "ministral-3:14b",
  [ProviderType.GOOGLE]: "gemini-2.5-flash-lite",
};

interface ModelConfig {
  provider: ProviderType;
  modelName: string;
}

function getModelConfig(role: ModelRole): ModelConfig {
  const providerEnv = (process.env[`LLM_PROVIDER_${role}`] ?? process.env.LLM_PROVIDER) ?? ProviderType.LOCAL;
  const isValidProvider = Object.values(ProviderType).includes(providerEnv as ProviderType);
  const provider: ProviderType = isValidProvider ? (providerEnv as ProviderType) : ProviderType.LOCAL;

  let modelName = "";
  if (provider === ProviderType.GOOGLE) {
    modelName = process.env[`GOOGLE_MODEL_${role}`] ?? process.env.GOOGLE_MODEL ?? DEFAULT_MODELS[ProviderType.GOOGLE];
  } else {
    modelName = process.env[`OLLAMA_MODEL_${role}`] ?? process.env.OLLAMA_MODEL ?? DEFAULT_MODELS[ProviderType.LOCAL];
  }

  return { provider, modelName };
}

export function getModel(role: ModelRole) {
  const config = getModelConfig(role);

  if (config.provider === ProviderType.GOOGLE) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(`CRITICAL: LLM_PROVIDER is ${config.provider} but GOOGLE_API_KEY is missing.`);
    }
    return new ChatGoogleGenerativeAI({
      modelName: config.modelName,
      temperature: 0,
    });
  }

  return new ChatOllama({
    model: config.modelName,
    temperature: 0,
    baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE,
  });
}

export function getModelInfo() {
  return {
    profiler: getModelConfig(ModelRole.PROFILER),
    scout: getModelConfig(ModelRole.SCOUT)
  };
}