import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import React from 'react';

interface ModeSelectionProps {
  onSelect: (skipScraping: boolean) => void;
}

export const ModeSelection: React.FC<ModeSelectionProps> = ({ onSelect }) => {
  const items = [
    {
      label: 'Deep Scan (Scrape pages - Slower but more thorough)',
      value: false,
    },
    {
      label: 'Quick Search (Search results only - Fast demo mode)',
      value: true,
    },
  ];

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan">Select search intensity:</Text>
      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
    </Box>
  );
};
