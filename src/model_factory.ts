import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";

type ModelRole = 'PLANNER' | 'WORKER';

export function getModel(_role: ModelRole) {
    const provider = process.env.LLM_PROVIDER || 'local'; // Default to local

    if (provider === 'google') {
        if (!process.env.GOOGLE_API_KEY) {
            console.warn("⚠️ Missing GOOGLE_API_KEY. Falling back to local planner.");
        } else {
             return new ChatGoogleGenerativeAI({
                modelName: "gemini-2.5-flash-lite",
                temperature: 0.2,
            });
        }
    }
    
    // Default / Local
    return new ChatOllama({
        model: "ministral-3:14b",
        temperature: 0.1,
        baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    });
}