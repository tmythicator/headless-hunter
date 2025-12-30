import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { APP_QUESTION } from '../constants';

interface InputSectionProps {
  query: string;
  setQuery: (query: string) => void;
  onSubmit: () => void;
  defaultQuery: string;
}

const InputSection: React.FC<InputSectionProps> = ({ query, setQuery, onSubmit, defaultQuery }) => {
  return (
    <Box flexDirection="column">
      <Text italic color="cyan">
        {APP_QUESTION}
      </Text>
      <Box marginTop={1}>
        <Text bold color="magenta">
          ›{' '}
        </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          onSubmit={onSubmit}
          placeholder={defaultQuery}
        />
      </Box>
    </Box>
  );
};

export default InputSection;
