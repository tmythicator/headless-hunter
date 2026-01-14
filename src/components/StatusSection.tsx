import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { WorkflowPhase } from '@/types';
import { APP_AGENT_HUNTING, APP_PROCESSING_STREAM } from '@/config/constants';
import { LogItem } from '@/hooks/useAgentWorkflow';

interface StatusSectionProps {
  phase: WorkflowPhase;
  logs: LogItem[];
  totalJobs?: number;
  processedJobs?: number;
  searchCount?: number;
}

const StatusSection: React.FC<StatusSectionProps> = ({
  phase,
  logs,
  totalJobs = 0,
  processedJobs = 0,
  searchCount = 0,
}) => {
  const showProgress = totalJobs > 0 || searchCount > 0;
  const isFinalizing =
    processedJobs === totalJobs && totalJobs > 0 && phase === WorkflowPhase.WORKING;

  // Last 10 logs for visibility
  const displayLogs = logs.slice(-10);

  return (
    <Box flexDirection="column">
      {phase === WorkflowPhase.WORKING && (
        <Box marginBottom={1}>
          <Text color="yellow">
            <Spinner type="dots" />{' '}
            <Text bold>{isFinalizing ? ' FINALIZING REPORT...' : ` ${APP_AGENT_HUNTING}`}</Text>
            {showProgress && !isFinalizing && (
              <Text>
                {' '}
                [Search: {searchCount} | Scans: {processedJobs}/{totalJobs}]
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
              {APP_PROCESSING_STREAM}
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
