import { Box, Text, Newline } from 'ink';
import Report from './Report';

interface ReportSectionProps {
  finalResult: string;
}

const ReportSection = ({ finalResult }: ReportSectionProps) => {
  return (
    <Box flexDirection="column" marginTop={1} padding={1} borderStyle="single" borderColor="green">
      <Text bold color="green">
        📄 RECRUITMENT REPORT:
      </Text>
      <Newline />
      <Report>{finalResult}</Report>
      <Newline />
      <Text color="dim">Press Ctrl+C to exit.</Text>
    </Box>
  );
};

export default ReportSection;
