import { StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state";
import { profilerNode, scoutNode } from "./nodes";

export const graph = new StateGraph(AgentState)
  .addNode("profiler", profilerNode)
  .addNode("scout", scoutNode)
  .addEdge("__start__", "profiler")
  .addEdge("profiler", "scout")
  .addEdge("scout", "__end__")
  .compile();