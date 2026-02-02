import { AgentNode } from '@/types';
import { StateGraph } from '@langchain/langgraph';
import { hunterNode, profilerNode, researcherNode, scoutNode } from './nodes';
import { AgentState } from './state';

export const graph = new StateGraph(AgentState)
  .addNode(AgentNode.PROFILER, profilerNode)
  .addNode(AgentNode.SCOUT, scoutNode)
  .addNode(AgentNode.RESEARCHER, researcherNode)
  .addNode(AgentNode.HUNTER, hunterNode)
  .addEdge('__start__', AgentNode.PROFILER)
  .addEdge(AgentNode.PROFILER, AgentNode.SCOUT)
  .addConditionalEdges(AgentNode.SCOUT, (state) => {
    if (state.config_skip_scraping) {
      return AgentNode.HUNTER;
    }
    return AgentNode.RESEARCHER;
  })
  .addConditionalEdges(AgentNode.RESEARCHER, (state) => {
    if (state.job_targets.length > 0) {
      return AgentNode.RESEARCHER;
    }
    return AgentNode.HUNTER;
  })
  .addEdge(AgentNode.HUNTER, '__end__')
  .compile();
