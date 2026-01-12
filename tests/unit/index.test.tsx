import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { render } from 'ink-testing-library';
import { HeadlessHunter } from '@/components/HeadlessHunter';
import { WorkflowPhase } from '@/types';
import stripAnsi from 'strip-ansi';
import { AgentWorkflow } from '@/hooks/useAgentWorkflow';
import {
  APP_AGENT_HUNTING,
  APP_GREETING,
  APP_PROCESSING_STREAM,
  APP_QUESTION,
  APP_REPORT_EXIT,
  APP_REPORT_TITLE,
} from '@/config/constants';

const mockStartWorkflow = mock(() => Promise.resolve());
const mockHook = mock(
  (): AgentWorkflow => ({
    phase: WorkflowPhase.INPUT,
    logs: [],
    finalResult: '',
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

    expect(output).toContain(APP_GREETING);
    expect(output).toContain(APP_QUESTION);
    expect(output).not.toContain(APP_AGENT_HUNTING);
    expect(output).not.toContain(APP_PROCESSING_STREAM);
    expect(output).not.toContain(mockFinalResult);
    expect(output).not.toContain(APP_REPORT_TITLE);
    expect(output).not.toContain(APP_REPORT_EXIT);
  });

  test('renders working state correctly', () => {
    const logs = ['Log 1', 'Log 2'];
    mockHook.mockReturnValue({
      phase: WorkflowPhase.WORKING,
      logs,
      finalResult: mockFinalResult,
      startWorkflow: mockStartWorkflow,
      setPhase: mock(),
    });

    const { lastFrame } = render(<HeadlessHunter />);
    const output = stripAnsi(lastFrame() ?? '');
    expect(output).toContain(APP_AGENT_HUNTING);
    expect(output).toContain(APP_PROCESSING_STREAM);
    expect(output).toContain(logs[0]);
    expect(output).toContain(logs[1]);
    expect(output).not.toContain(mockFinalResult);
    expect(output).not.toContain(APP_REPORT_TITLE);
    expect(output).not.toContain(APP_REPORT_EXIT);
  });

  test('renders ReportSection when in DONE phase', () => {
    mockHook.mockReturnValue({
      phase: WorkflowPhase.DONE,
      logs: [],
      finalResult: mockFinalResult,
      startWorkflow: mockStartWorkflow,
      setPhase: mock(),
    });

    const { lastFrame } = render(<HeadlessHunter />);
    const output = stripAnsi(lastFrame() ?? '');

    expect(output).toContain('Great Success');
    expect(output).toContain(APP_REPORT_TITLE);
    expect(output).toContain(APP_REPORT_EXIT);
  });
});
