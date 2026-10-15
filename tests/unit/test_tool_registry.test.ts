import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '@/lib/tools/registry';
import { MockGmailAdapter } from '@/lib/integrations/gmail/mock';
import { UserPreferencesSchema } from '@/types';

describe('ToolRegistry - Schema Validation and Tool Execution', () => {
  const adapter = new MockGmailAdapter();
  const prefs = UserPreferencesSchema.parse({});

  it('registers all core tools with schemas and risk ratings', () => {
    const tools = ToolRegistry.listTools();
    const names = tools.map(t => t.name);

    expect(names).toContain('gmail_search');
    expect(names).toContain('gmail_preview_cleanup');
    expect(names).toContain('gmail_trash_messages');
    expect(names).toContain('gmail_archive_messages');
    expect(names).toContain('gmail_send_message');
    expect(names).toContain('gmail_verify_trash_state');
  });

  it('validates schema arguments and rejects malformed inputs', async () => {
    // Missing required messageIds
    await expect(
      ToolRegistry.executeTool('gmail_trash_messages', {}, adapter, prefs)
    ).rejects.toThrow();

    // Invalid email format for send
    await expect(
      ToolRegistry.executeTool('gmail_send_message', { to: 'not-an-email', subject: 'A', body: 'B' }, adapter, prefs)
    ).rejects.toThrow();
  });

  it('executes preview tool and returns qualifying vs protected breakdown', async () => {
    const res = await ToolRegistry.executeTool(
      'gmail_preview_cleanup',
      { olderThanYears: 5 },
      adapter,
      prefs
    );

    expect(res).toBeDefined();
    expect(res.qualifyingCount).toBe(3);
    expect(res.protectedCount).toBe(3);
    expect(res.qualifyingIds.length).toBe(3);
  });
});
