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

export interface LogItem {
  id: number;
  message: string;
}

export interface AgentWorkflow {
  phase: WorkflowPhase;
  logs: LogItem[];
  finalResult: string;
  totalJobs: number;
  processedJobs: number;
  searchCount: number;
  startWorkflow: (query: string, resumePath: string | null) => Promise<void>;
  setPhase: (phase: WorkflowPhase) => void;
}

export const useAgentWorkflow = (): AgentWorkflow => {
  const [phase, setPhase] = useState<WorkflowPhase>(WorkflowPhase.RESUME_SELECTION);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [finalResult, setFinalResult] = useState<string>('');
  const [totalJobs, setTotalJobs] = useState(0);
  const [processedJobs, setProcessedJobs] = useState(0);
  const [searchCount, setSearchCount] = useState(0);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), message: msg }]);
  }, []);

  const startWorkflow = async (query: string, resumePath: string | null) => {
    // Clear the terminal to avoid ghosting from previous runs
    process.stdout.write('\x1Bc');

    setPhase(WorkflowPhase.WORKING);
    setLogs([]);
    setTotalJobs(0);
    setProcessedJobs(0);
    setSearchCount(0);

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
        const stream = await graph.stream(
          {
            user_input_prompt: query,
            resume_path: resumePath,
            config_output_path: resultPath,
          },
          { recursionLimit: 50 }
        );

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
            if (data?.total_jobs !== undefined) setTotalJobs(data.total_jobs);
            if (data?.search_count !== undefined) {
              setSearchCount(data.search_count);
              addLog(`🔍  Global search returned ${data.search_count} potential links.`);
            }
          }

          if (step[AgentNode.ANALYST]) {
            const data = step[AgentNode.ANALYST];
            if (data?.processed_jobs !== undefined) {
              setProcessedJobs(data.processed_jobs);
              // Provide visual feedback for small iterations
              if (data.messages && data.messages.length > 0) {
                const msg = data.messages[data.messages.length - 1].content;
                if (typeof msg === 'string' && msg.startsWith('Processed')) {
                  addLog(`🛡️  ${msg}`);
                }
              }
            }

            // If we just finished the last job, signal the final phase immediately
            if (data?.job_targets?.length === 0) {
              addLog('🖋️  Scanning complete. Synthesizing final report with LLM...');
            }
          }

          if (step[AgentNode.REPORTER]) {
            const data = step[AgentNode.REPORTER];

            if (data?.messages && data.messages.length > 0) {
              const lastMessage = data.messages[data.messages.length - 1];
              const content = lastMessage.content;

              if (typeof content === 'string' && content.length > 100) {
                setFinalResult(ensureString(content));
                addLog(UI_STEP_FINISHED(AgentNode.REPORTER));
              }
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
    totalJobs,
    processedJobs,
    searchCount,
    startWorkflow,
    setPhase,
  };
};
