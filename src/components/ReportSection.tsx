import { Box, Text, Newline } from 'ink';
import Report from './Report';
import { APP_REPORT_EXIT, APP_REPORT_TITLE } from '../config/constants';

interface ReportSectionProps {
  finalResult: string;
}

const ReportSection = ({ finalResult }: ReportSectionProps) => {
  return (
    <Box flexDirection="column" marginTop={1} padding={1} borderStyle="single" borderColor="green">
      <Text bold color="green">
        {APP_REPORT_TITLE}
      </Text>
      <Newline />
      <Report>{finalResult}</Report>
      <Newline />
      <Text color="dim">{APP_REPORT_EXIT}</Text>
    </Box>
  );
};

export default ReportSection;
