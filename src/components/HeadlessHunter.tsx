import { useState } from 'react';
import { Box } from 'ink';
import { DEFAULT_QUERY } from '../constants';
import ReportSection from './ReportSection';
import Header from './Header';
import InputSection from './InputSection';
import StatusSection from './StatusSection';
import { ResumeSelection } from './ResumeSelection';
import { useAgentWorkflow } from '../hooks/useAgentWorkflow';
import { WorkflowPhase } from '../types';

export const HeadlessHunter = () => {
  const [query, setQuery] = useState('');
  const [resumePath, setResumePath] = useState<string | null>(null);
  const { phase, logs, finalResult, startWorkflow, setPhase } = useAgentWorkflow();

  const handleResumeSelect = (path: string | null) => {
    setResumePath(path);
    setPhase(WorkflowPhase.INPUT);
  };

  const handleSubmit = () => {
    const finalQuery = query.trim() || DEFAULT_QUERY;
    void startWorkflow(finalQuery, resumePath);
  };

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor={
        phase === WorkflowPhase.DONE ? 'green' : phase === WorkflowPhase.WORKING ? 'yellow' : 'cyan'
      }
    >
      <Header />

      {phase === WorkflowPhase.RESUME_SELECTION && (
        <ResumeSelection onSelect={handleResumeSelect} />
      )}

      {phase === WorkflowPhase.INPUT && (
        <InputSection
          query={query}
          setQuery={setQuery}
          onSubmit={handleSubmit}
          defaultQuery={DEFAULT_QUERY}
        />
      )}

      <StatusSection phase={phase} logs={logs} />

      {phase === WorkflowPhase.DONE && <ReportSection finalResult={finalResult} />}
    </Box>
  );
};
