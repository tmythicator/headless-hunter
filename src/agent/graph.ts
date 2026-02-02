import { AgentNode } from '@/types';
import { StateGraph } from '@langchain/langgraph';
import { analystNode, profilerNode, reporterNode, scoutNode } from './nodes';
import { AgentState } from './state';

export const graph = new StateGraph(AgentState)
  .addNode(AgentNode.PROFILER, profilerNode)
  .addNode(AgentNode.SCOUT, scoutNode)
  .addNode(AgentNode.ANALYST, analystNode)
  .addNode(AgentNode.REPORTER, reporterNode)
  .addEdge('__start__', AgentNode.PROFILER)
  .addEdge(AgentNode.PROFILER, AgentNode.SCOUT)
  .addConditionalEdges(AgentNode.SCOUT, (state) => {
    if (state.config_skip_scraping) {
      return AgentNode.REPORTER;
    }
    return AgentNode.ANALYST;
  })
  .addConditionalEdges(AgentNode.ANALYST, (state) => {
    if (state.job_targets.length > 0) {
      return AgentNode.ANALYST;
    }
    return AgentNode.REPORTER;
  })
  .addEdge(AgentNode.REPORTER, '__end__')
  .compile();
