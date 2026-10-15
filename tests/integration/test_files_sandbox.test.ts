import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SandboxedFileService } from '@/lib/integrations/files/service';
import { ResultVerifier } from '@/lib/verification/verifier';
import { PlannedAction } from '@/types';
import fs from 'fs';
import path from 'path';

describe('Sandboxed File System Integration & Security Boundaries', () => {
  const testDir = path.join(process.cwd(), 'data', 'test_sandbox');
  let files: SandboxedFileService;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    files = new SandboxedFileService(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('writes, reads, and lists files safely inside sandbox', async () => {
    const writeRes = await files.writeFile('notes/meeting.txt', 'Discussing Q4 roadmap items.');
    expect(writeRes.success).toBe(true);

    const readRes = await files.readFile('notes/meeting.txt');
    expect(readRes.content).toBe('Discussing Q4 roadmap items.');

    const list = await files.listFiles('notes');
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('meeting.txt');
  });

  it('moves files and authoritatively verifies destination existence', async () => {
    await files.writeFile('drafts/doc.md', '# Draft Document');
    const moveRes = await files.moveFile('drafts/doc.md', 'archive/doc.md');
    expect(moveRes.success).toBe(true);

    const action: PlannedAction = {
      id: 'act_file_move',
      integration: 'sandboxed_files',
      toolName: 'files_move',
      arguments: { sourcePath: 'drafts/doc.md', destPath: 'archive/doc.md' },
      requiredPermission: 'files.write',
      targetResource: 'files:archive/doc.md',
      expectedOutcome: 'Move document',
      riskLevel: 'reversible_write',
      approvalRequired: true,
      status: 'succeeded',
      verificationStatus: 'pending',
      retryCount: 0
    };

    const outcome = await ResultVerifier.verifyAction(action, { files });
    expect(outcome.verified).toBe(true);
  });

  it('STRICTLY BLOCKS path traversal attempts outside sandboxed workspace', async () => {
    // Attempt directory escape via ../
    await expect(
      files.readFile('../../../etc/passwd')
    ).rejects.toThrow(/SECURITY VIOLATION.*Path traversal attempted/);

    await expect(
      files.writeFile('../escape.txt', 'malicious')
    ).rejects.toThrow(/SECURITY VIOLATION.*Path traversal attempted/);
  });
});
