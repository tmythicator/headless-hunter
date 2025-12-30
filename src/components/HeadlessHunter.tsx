import { useState } from 'react';
import { Box } from 'ink';
import ReportSection from './ReportSection';
import Header from './Header';
import InputSection from './InputSection';
import StatusSection from './StatusSection';
import { useAgentWorkflow } from '../hooks/useAgentWorkflow';
import { WorkflowPhase } from '../types';

export const HeadlessHunter = () => {
  const DEFAULT_QUERY = 'Senior Software Engineer (React/TS). Location: München. Remote';

  const [query, setQuery] = useState('');
  const { phase, logs, finalResult, startWorkflow } = useAgentWorkflow();

  const handleSubmit = () => {
    const finalQuery = query.trim() || DEFAULT_QUERY;
    void startWorkflow(finalQuery);
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
