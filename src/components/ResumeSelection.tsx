import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { listResumes } from '../tools/resume_loader';

interface ResumeSelectionProps {
  onSelect: (path: string | null) => void;
}

export const ResumeSelection: React.FC<ResumeSelectionProps> = ({ onSelect }) => {
  const [items, setItems] = useState<{ label: string; value: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResumes = async () => {
      const files = await listResumes();
      const fileItems = files.map((f) => ({ label: f, value: f }));
      setItems([...fileItems, { label: 'No Resume (Skip)', value: null }]);
      setLoading(false);
    };
    void fetchResumes();
  }, []);

  if (loading) {
    return <Text>Loading resumes...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan">Select a Resume to use:</Text>
      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
    </Box>
  );
};
