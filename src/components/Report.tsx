import { Text, Box } from 'ink';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const FormattedLine = ({ line }: { line: string }) => {
  if (line.startsWith('#')) {
    const plain = line.replace(/^#+\s*/, '');
    return (
      <Box marginTop={1} marginBottom={0} flexDirection="column">
        <Text bold color="magenta">
          {plain}
        </Text>
        <Text dimColor>{'='.repeat(plain.length)}</Text>
      </Box>
    );
  }

  // List items
  if (/^[-*]\s/.exec(line.trim())) {
    const plain = line.trim().replace(/^[-*]\s/, '');
    return (
      <Box marginLeft={2}>
        <Text color="green">• </Text>
        <Text>{parseInline(plain)}</Text>
      </Box>
    );
  }

  // Numbered lists
  if (/^\d+\.\s/.exec(line.trim())) {
    return (
      <Box marginLeft={2}>
        <Text color="yellow">{/^\d+\.\s/.exec(line)![0]}</Text>
        <Text>{parseInline(line.replace(/^\d+\.\s/, ''))}</Text>
      </Box>
    );
  }

  // Horizontal Rule
  if (/^(-{3,}|\*{3,})$/.exec(line.trim())) {
    return <Text dimColor>{'─'.repeat(60)}</Text>;
  }

  // Default with inline parsing
  return <Text>{parseInline(line)}</Text>;
};

const parseInline = (text: string) => {
  // Split by URLs first
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (part.match(URL_REGEX)) {
      return (
        <Text key={i} color="blue" underline>
          {part}
        </Text>
      );
    }

    // Then handle bold (**text**)
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return (
      <Text key={i}>
        {boldParts.map((subPart, j) => {
          if (subPart.startsWith('**') && subPart.endsWith('**')) {
            return (
              <Text key={j} bold color="cyan">
                {subPart.slice(2, -2)}
              </Text>
            );
          }
          // Handle the specific "Tavily interpretation" badge
          if (subPart.includes('[Tavily interpretation only')) {
            return (
              <Text key={j} color="yellow" italic>
                {subPart}
              </Text>
            );
          }
          // Handle "Verified Live" badge for completeness
          if (subPart.includes('[Verified Live]')) {
            return (
              <Text key={j} color="green" bold>
                {subPart}
              </Text>
            );
          }
          return subPart;
        })}
      </Text>
    );
  });
};

export default function Report({ children }: { children: string }) {
  const lines = children.split('\n');

  return (
    <Box flexDirection="column" width="100%">
      {lines.map((line, i) => (
        <FormattedLine key={i} line={line} />
      ))}
    </Box>
  );
}
