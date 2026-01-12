import { useState, useCallback } from 'react';
import { graph } from '@/agent/graph';
import { AgentStateType } from '@/agent/state';
import { WorkflowPhase, AgentNode } from '@/types';
import { ensureString } from '@/tools';
import { getNextHuntFilePath, getLogFilePath } from '@/utils';
import { runWithLogPath } from '@/utils/logger';
import {
  UI_TARGET_LOCKED,
  UI_USING_RESUME,
  UI_NO_RESUME,
  UI_RESULT_PATH,
  UI_TRACE_PATH,
  UI_INIT,
  UI_PROFILER_TARGET,
  UI_STEP_FINISHED,
  UI_MISSION_COMPLETE,
  UI_ERROR,
} from '@/config/constants';

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

    // Generate paths synchronously to ensure they match
    const resultPath = getNextHuntFilePath();
    const logPath = getLogFilePath(resultPath);

    // Wrap execution with log context
    await runWithLogPath(logPath, async () => {
      addLog(UI_TARGET_LOCKED(query));
      if (resumePath) {
        addLog(UI_USING_RESUME(resumePath));
      } else {
        addLog(UI_NO_RESUME);
      }
      addLog(UI_RESULT_PATH(resultPath));
      addLog(UI_TRACE_PATH(logPath));
      addLog(UI_INIT);

      try {
        const stream = await graph.stream({
          user_input_prompt: query,
          resume_path: resumePath,
          config_output_path: resultPath,
        });

        for await (const chunk of stream) {
          const step = chunk as Partial<Record<AgentNode, Partial<AgentStateType>>>;

          if (step[AgentNode.PROFILER]) {
            const role = step[AgentNode.PROFILER]?.profiler_summary?.role;
            addLog(UI_PROFILER_TARGET(role ?? 'Unknown'));
            addLog(UI_STEP_FINISHED(AgentNode.PROFILER));
          }

          if (step[AgentNode.SCOUT]) {
            const data = step[AgentNode.SCOUT];
            addLog(UI_STEP_FINISHED(AgentNode.SCOUT));

            if (data?.messages && data.messages.length > 0) {
              const content = data.messages[0].content;
              setFinalResult(ensureString(content));
            }
          }
        }
        addLog(UI_MISSION_COMPLETE);
      } catch (error) {
        addLog(UI_ERROR(error instanceof Error ? error.message : String(error)));
      } finally {
        setPhase(WorkflowPhase.DONE);
      }
    });
  };

  return {
    phase,
    logs,
    finalResult,
    startWorkflow,
    setPhase,
  };
};
