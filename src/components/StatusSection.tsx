import { APP, STATUS } from '@/config/constants';
import { LogItem } from '@/hooks/useAgentWorkflow';
import { WorkflowPhase } from '@/types';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface StatusSectionProps {
  phase: WorkflowPhase;
  logs: LogItem[];
  totalJobs?: number;
  processedJobs?: number;
  searchCount?: number;
  isQuickSearch?: boolean;
}

const StatusSection: React.FC<StatusSectionProps> = ({
  phase,
  logs,
  totalJobs = 0,
  processedJobs = 0,
  searchCount = 0,
  isQuickSearch = false,
}) => {
  const showProgress = searchCount > 0 || totalJobs > 0;
  const isFinalizing =
    (isQuickSearch && searchCount > 0 && phase === WorkflowPhase.WORKING) ||
    (processedJobs === totalJobs && totalJobs > 0 && phase === WorkflowPhase.WORKING);

  // Last 10 logs for visibility
  const displayLogs = logs.slice(-10);

  return (
    <Box flexDirection="column">
      {phase === WorkflowPhase.WORKING && (
        <Box marginBottom={1}>
          <Text color="yellow">
            <Spinner type="dots" />{' '}
            <Text bold>{isFinalizing ? STATUS.FINALIZING : ` ${APP.AGENT_HUNTING}`}</Text>
            {showProgress && !isFinalizing && (
              <Text>
                {' '}
                [{STATUS.SEARCH_COUNT} {searchCount}
                {!isQuickSearch ? ` | ${STATUS.SCANS} ${processedJobs}/${totalJobs}` : ''}]
              </Text>
            )}
          </Text>
        </Box>
      )}

      {(phase === WorkflowPhase.WORKING || phase === WorkflowPhase.DONE) && (
        <Box
          flexDirection="column"
          paddingX={1}
          borderStyle="single"
          borderColor="gray"
          minHeight={12}
        >
          <Box marginBottom={1}>
            <Text bold underline color="gray">
              {APP.PROCESSING_STREAM}
            </Text>
          </Box>
          <Box flexDirection="column">
            {displayLogs.map((log) => (
              <Text key={log.id} dimColor>
                {log.message}
              </Text>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default StatusSection;
