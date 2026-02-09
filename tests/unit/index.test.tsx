import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render } from 'ink-testing-library';
import { HeadlessHunter } from '@/components/HeadlessHunter';
import { WorkflowPhase } from '@/types';
import stripAnsi from 'strip-ansi';
import { AgentWorkflow } from '@/hooks/useAgentWorkflow';
import { APP } from '@/config/constants';

const mockStartWorkflow = mock(() => Promise.resolve());
const mockHook = mock(
  (): AgentWorkflow => ({
    phase: WorkflowPhase.INPUT,
    logs: [],
    finalResult: '',
    totalJobs: 0,
    processedJobs: 0,
    searchCount: 0,
    startWorkflow: mockStartWorkflow,
    setPhase: mock(),
  })
);

void mock.module('../../src/hooks/useAgentWorkflow', () => ({
  useAgentWorkflow: mockHook,
}));

const mockFinalResult = '# Great Success';

describe('HeadlessHunter', () => {
  beforeEach(() => {
    mockStartWorkflow.mockClear();
    mockHook.mockClear();
  });

  test('renders InputSection when in INPUT phase', () => {
    const { lastFrame } = render(<HeadlessHunter />);
    const output = stripAnsi(lastFrame() ?? '');

    expect(output).toContain(APP.GREETING);
    expect(output).toContain(APP.QUESTION);
    expect(output).not.toContain(APP.AGENT_HUNTING);
    expect(output).not.toContain(APP.PROCESSING_STREAM);
    expect(output).not.toContain(mockFinalResult);
    expect(output).not.toContain(APP.REPORT_TITLE);
    expect(output).not.toContain(APP.REPORT_EXIT);
  });

  test('renders working state correctly', () => {
    const logs = [
      { id: 1, message: 'Log 1' },
      { id: 2, message: 'Log 2' },
    ];
    mockHook.mockReturnValue({
      phase: WorkflowPhase.WORKING,
      logs,
      finalResult: mockFinalResult,
      totalJobs: 0,
      processedJobs: 0,
      searchCount: 0,
      startWorkflow: mockStartWorkflow,
      setPhase: mock(),
    });

    const { lastFrame } = render(<HeadlessHunter />);
    const output = stripAnsi(lastFrame() ?? '');
    expect(output).toContain(APP.AGENT_HUNTING);
    expect(output).toContain(APP.PROCESSING_STREAM);
    expect(output).toContain(logs[0].message);
    expect(output).toContain(logs[1].message);
    expect(output).not.toContain(mockFinalResult);
    expect(output).not.toContain(APP.REPORT_TITLE);
    expect(output).not.toContain(APP.REPORT_EXIT);
  });

  test('renders ReportSection when in DONE phase', () => {
    mockHook.mockReturnValue({
      phase: WorkflowPhase.DONE,
      logs: [],
      finalResult: mockFinalResult,
      totalJobs: 0,
      processedJobs: 0,
      searchCount: 0,
      startWorkflow: mockStartWorkflow,
      setPhase: mock(),
    });

    const { lastFrame } = render(<HeadlessHunter />);
    const output = stripAnsi(lastFrame() ?? '');

    expect(output).toContain('Great Success');
    expect(output).toContain(APP.REPORT_TITLE);
    expect(output).toContain(APP.REPORT_EXIT);
  });
});
