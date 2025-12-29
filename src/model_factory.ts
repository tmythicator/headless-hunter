import { ChatOllama } from "@langchain/ollama";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export enum ModelRole {
  PROFILER = 'PROFILER',
  SCOUT = 'SCOUT'
}

const DEFAULTS = {
  local: "ministral-3:14b",
  google: "gemini-2.5-flash-lite",
  ollama_base: "http://localhost:11434"
};

interface ModelConfig {
  provider: 'local' | 'google';
  modelName: string;
}

function getModelConfig(role: ModelRole): ModelConfig {
  const providerStr = (process.env[`LLM_PROVIDER_${role}`] || process.env.LLM_PROVIDER || 'local').toLowerCase();
  const provider = (providerStr === 'google') ? 'google' : 'local';

  let modelName = "";
  if (provider === 'google') {
    modelName = process.env[`GOOGLE_MODEL_${role}`] || process.env.GOOGLE_MODEL || DEFAULTS.google;
  } else {
    modelName = process.env[`OLLAMA_MODEL_${role}`] || process.env.OLLAMA_MODEL || DEFAULTS.local;
  }

  return { provider, modelName };
}

export function getModel(role: ModelRole) {
  const config = getModelConfig(role);

  if (config.provider === 'google') {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error(`CRITICAL: LLM_PROVIDER is 'google' but GOOGLE_API_KEY is missing.`);
    }
    return new ChatGoogleGenerativeAI({
      modelName: config.modelName,
      temperature: 0,
    });
  }

  return new ChatOllama({
    model: config.modelName,
    temperature: 0,
    baseUrl: process.env.OLLAMA_BASE_URL || DEFAULTS.ollama_base,
  });
}

export function getModelInfo() {
  return {
    profiler: getModelConfig(ModelRole.PROFILER),
    scout: getModelConfig(ModelRole.SCOUT)
  };
}