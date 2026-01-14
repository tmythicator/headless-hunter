import { StateGraph } from '@langchain/langgraph';
import { AgentState } from './state';
import { profilerNode, scoutNode, analystNode, reporterNode } from './nodes';
import { AgentNode } from '@/types';

export const graph = new StateGraph(AgentState)
  .addNode(AgentNode.PROFILER, profilerNode)
  .addNode(AgentNode.SCOUT, scoutNode)
  .addNode(AgentNode.ANALYST, analystNode)
  .addNode(AgentNode.REPORTER, reporterNode)
  .addEdge('__start__', AgentNode.PROFILER)
  .addEdge(AgentNode.PROFILER, AgentNode.SCOUT)
  .addEdge(AgentNode.SCOUT, AgentNode.ANALYST)
  .addConditionalEdges(AgentNode.ANALYST, (state) => {
    if (state.job_targets.length > 0) {
      return AgentNode.ANALYST;
    }
    return AgentNode.REPORTER;
  })
  .addEdge(AgentNode.REPORTER, '__end__')
  .compile();
