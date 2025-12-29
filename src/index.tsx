import React, { useState } from 'react';
import { render, Box, Text, Newline, useApp } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import Report from './components/Report';
import { graph } from './graph';
import { getModelInfo, ModelRole } from './model_factory';
import { UserPreferences } from './types';
import { BaseMessage } from "@langchain/core/messages";

const HeadlessHunterApp = () => {
  const { exit: _exit } = useApp();
  const [phase, setPhase] = useState<'input' | 'working' | 'done'>('input');
  const [query, setQuery] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState<string>('');

  const addLog = (msg: string) => {
    setLogs((prev: string[]) => [...prev.slice(-10), msg]);
  };

  const DEFAULT_QUERY = "Senior Software React Engineer. Preferred location: München. Remote possible.";

  const handleSubmit = async () => {
    const finalQuery = query.trim() || DEFAULT_QUERY;
    setPhase('working');
    addLog(`🎯 Target locked: "${finalQuery}"`);
    addLog("🚀 Initializing Agentic Workflow...");

    try {
      const stream = await graph.stream({ user_wishlist: finalQuery });

      for await (const step of stream) {
        const nodeName = Object.keys(step as Record<string, unknown>)[0];
        // Type the step strictly to avoid any
        const stepRecord = step as Record<string, { user_preferences?: UserPreferences; messages?: BaseMessage[] }>;
        const stepData = stepRecord[nodeName];

        if (nodeName === 'profiler') {
          const role = stepData.user_preferences?.role;
          addLog(`✅ Profiler target: ${role}`);
        }

        addLog(`✅ Step finished: ${nodeName}`);

        if (nodeName === 'scout' && stepData?.messages && stepData.messages.length > 0) {
          const content = stepData.messages[0].content;
          setFinalResult(typeof content === 'string' ? content : JSON.stringify(content));
        }
      }

      addLog("🏁 Mission Complete.");
      setPhase('done');
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      setPhase('done');
    }
  };

  const modelInfo = getModelInfo();

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor={phase === 'done' ? 'green' : phase === 'working' ? 'yellow' : 'cyan'}
    >
      <Box marginBottom={1} justifyContent="center" flexDirection="column" alignItems="center">
        <Text bold color="green">
                                   [ 💀 HEADLESS HUNTER ]
        </Text>
        <Box marginTop={0}>
           <Text>
             <Text color="magenta" bold>[{ModelRole.PROFILER}]</Text> <Text color="white">{modelInfo.profiler.modelName}</Text> <Text dimColor>({modelInfo.profiler.provider})</Text>
           </Text>
           <Text dimColor> | </Text>
           <Text>
             <Text color="yellow" bold>[{ModelRole.SCOUT}]</Text> <Text color="white">{modelInfo.scout.modelName}</Text> <Text dimColor>({modelInfo.scout.provider})</Text>
           </Text>
        </Box>
      </Box>

      {phase === 'input' && (
        <Box flexDirection="column">
          <Text italic color="cyan">What kind of job are we hunting today?</Text>
          <Box marginTop={1}>
            <Text bold color="magenta">› </Text>
            <TextInput
              value={query}
              onChange={setQuery}
              onSubmit={handleSubmit}
              placeholder={DEFAULT_QUERY}
            />
          </Box>
        </Box>
      )}

      {phase === 'working' && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow">
            <Spinner type="dots" /> <Text bold>AGENT IS HUNTING...</Text>
          </Text>
        </Box>
      )}

      {(phase === 'working' || phase === 'done') && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline color="gray">Processing Stream:</Text>
          {logs.map((log: string, i: number) => (
            <Text key={i} dimColor={i < logs.length - 1}>
              {log}
            </Text>
          ))}
        </Box>
      )}

      {phase === 'done' && (
        <Box flexDirection="column" marginTop={1} padding={1} borderStyle="single" borderColor="green">
          <Text bold color="green">📄 RECRUITMENT REPORT:</Text>
          <Newline />
          <Report>{finalResult}</Report>
          <Newline />
          <Text color="dim">Press Ctrl+C to exit.</Text>
        </Box>
      )}
    </Box>
  );
};

render(<HeadlessHunterApp />);