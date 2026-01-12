import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { WorkflowPhase } from '../types';
import { APP_AGENT_HUNTING, APP_PROCESSING_STREAM } from '../config/constants';

interface StatusSectionProps {
  phase: WorkflowPhase;
  logs: string[];
}

const StatusSection: React.FC<StatusSectionProps> = ({ phase, logs }) => {
  return (
    <>
      {phase === WorkflowPhase.WORKING && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow">
            <Spinner type="dots" /> <Text bold>{APP_AGENT_HUNTING}</Text>
          </Text>
        </Box>
      )}

      {(phase === WorkflowPhase.WORKING || phase === WorkflowPhase.DONE) && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline color="gray">
            {APP_PROCESSING_STREAM}
          </Text>
          {logs.map((log: string, i: number) => (
            <Text key={i} dimColor={i < logs.length - 1}>
              {log}
            </Text>
          ))}
        </Box>
      )}
    </>
  );
};

export default StatusSection;
