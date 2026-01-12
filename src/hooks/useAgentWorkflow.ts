import { useState, useCallback } from 'react';
import { graph } from '../graph';
import { AgentStateType } from '../state';
import { WorkflowPhase, AgentNode } from '../types';
import { ensureString } from '../tools';

export interface AgentWorkflow {
  phase: WorkflowPhase;
  logs: string[];
  finalResult: string;
  startWorkflow: (query: string, resumePath: string | null) => Promise<void>;
  setPhase: (phase: WorkflowPhase) => void;
}

export const useAgentWorkflow = (): AgentWorkflow => {
  const [phase, setPhase] = useState<WorkflowPhase>(WorkflowPhase.RESUME_SELECTION);
  const [logs, setLogs] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState<string>('');

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-10), msg]);
  }, []);

  const startWorkflow = async (query: string, resumePath: string | null) => {
    setPhase(WorkflowPhase.WORKING);
    addLog(`🎯 Target locked: "${query}"`);
    if (resumePath) {
        addLog(`📄 Using resume: ${resumePath}`);
    } else {
        addLog(`⚠️ No resume selected.`);
    }
    addLog('🚀 Initializing Agentic Workflow...');

    try {
      const stream = await graph.stream({ user_input_prompt: query, resume_path: resumePath });

      for await (const chunk of stream) {
        const step = chunk as Partial<Record<AgentNode, Partial<AgentStateType>>>;

        if (step[AgentNode.PROFILER]) {
          const role = step[AgentNode.PROFILER]?.profiler_summary?.role;
          addLog(`✅ Profiler target: ${role}`);
          addLog(`✅ Step finished: ${AgentNode.PROFILER}`);
        }

        if (step[AgentNode.SCOUT]) {
          const data = step[AgentNode.SCOUT];
          addLog(`✅ Step finished: ${AgentNode.SCOUT}`);

          if (data?.messages && data.messages.length > 0) {
            const content = data.messages[0].content;
            setFinalResult(ensureString(content));
          }
        }
      }
      addLog('🏁 Mission Complete.');
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setPhase(WorkflowPhase.DONE);
    }
  };

  return {
    phase,
    logs,
    finalResult,
    startWorkflow,
    setPhase,
  };
};
