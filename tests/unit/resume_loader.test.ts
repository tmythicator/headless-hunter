import { describe, expect, test, spyOn, afterEach } from 'bun:test';
import { loadResume } from '@/tools/resume_loader';
import fs from 'fs';

// Mock fs.readFileSync
const readFileSyncSpy = spyOn(fs, 'readFileSync');

describe('Resume Loader', () => {
  afterEach(() => {
    readFileSyncSpy.mockClear();
  });

  test('should load a specific resume file', async () => {
    const resumePath = 'tests/fixtures/resume_example.md'; // Use fixture as it is guaranteed to exist
    const content = await loadResume(resumePath);
    expect(content).toBeTruthy();
    expect(content).toContain('# John Doe');
  });
});
