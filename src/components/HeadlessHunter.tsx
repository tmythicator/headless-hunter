import { APP } from '@/config/constants';
import { useAgentWorkflow } from '@/hooks/useAgentWorkflow';
import { WorkflowPhase } from '@/types';
import { Box } from 'ink';
import { useState } from 'react';
import Header from './Header';
import InputSection from './InputSection';
import { ModeSelection } from './ModeSelection';
import ReportSection from './ReportSection';
import { ResumeSelection } from './ResumeSelection';
import StatusSection from './StatusSection';

export const HeadlessHunter = () => {
  const [query, setQuery] = useState('');
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [skipScraping, setSkipScraping] = useState(false);
  const {
    phase,
    logs,
    finalResult,
    totalJobs,
    processedJobs,
    searchCount,
    startWorkflow,
    setPhase,
  } = useAgentWorkflow();

  const handleResumeSelect = (path: string | null) => {
    setResumePath(path);
    setPhase(WorkflowPhase.MODE_SELECTION);
  };

  const handleModeSelect = (skip: boolean) => {
    setSkipScraping(skip);
    setPhase(WorkflowPhase.INPUT);
  };

  const handleSubmit = () => {
    const finalQuery = query.trim() || APP.DEFAULT_QUERY;
    void startWorkflow(finalQuery, resumePath, skipScraping);
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

      {phase === WorkflowPhase.MODE_SELECTION && <ModeSelection onSelect={handleModeSelect} />}

      {phase === WorkflowPhase.INPUT && (
        <InputSection
          query={query}
          setQuery={setQuery}
          onSubmit={handleSubmit}
          defaultQuery={APP.DEFAULT_QUERY}
        />
      )}

      <StatusSection
        phase={phase}
        logs={logs}
        totalJobs={totalJobs}
        processedJobs={processedJobs}
        searchCount={searchCount}
        isQuickSearch={skipScraping}
      />

      {phase === WorkflowPhase.DONE && <ReportSection finalResult={finalResult} />}
    </Box>
  );
};
