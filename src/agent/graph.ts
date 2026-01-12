import { StateGraph } from '@langchain/langgraph';
import { AgentState } from './state';
import { profilerNode, scoutNode } from './nodes';
import { AgentNode } from '@/types';

export const graph = new StateGraph(AgentState)
  .addNode(AgentNode.PROFILER, profilerNode)
  .addNode(AgentNode.SCOUT, scoutNode)
  .addEdge('__start__', AgentNode.PROFILER)
  .addEdge(AgentNode.PROFILER, AgentNode.SCOUT)
  .addEdge(AgentNode.SCOUT, '__end__')
  .compile();
