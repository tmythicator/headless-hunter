import { Box, Text } from 'ink';
import { getModelInfo } from '../llm/model_factory';
import { AgentNode } from '../types';
import { APP_GREETING } from '../config/constants';

const Header = () => {
  const modelInfo = getModelInfo();

  return (
    <Box marginBottom={1} justifyContent="center" flexDirection="column" alignItems="center">
      <Text bold color="green">
        {APP_GREETING}
      </Text>
      <Box marginTop={0}>
        <Text>
          <Text color="magenta" bold>
            [{AgentNode.PROFILER.toUpperCase()}]
          </Text>{' '}
          <Text color="white">{modelInfo.profiler.modelName}</Text>{' '}
          <Text dimColor>({modelInfo.profiler.provider})</Text>
        </Text>
        <Text dimColor> | </Text>
        <Text>
          <Text color="yellow" bold>
            [{AgentNode.SCOUT.toUpperCase()}]
          </Text>{' '}
          <Text color="white">{modelInfo.scout.modelName}</Text>{' '}
          <Text dimColor>({modelInfo.scout.provider})</Text>
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
