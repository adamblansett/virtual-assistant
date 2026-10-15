import { describe, it, expect, beforeEach } from 'vitest';
import { MockGmailAdapter } from '@/lib/integrations/gmail/mock';

describe('MockGmailAdapter - Lifecycle and State Transitions', () => {
  let adapter: MockGmailAdapter;

  beforeEach(() => {
    adapter = new MockGmailAdapter();
  });

  it('reports correct metadata and initial connection status', async () => {
    const meta = await adapter.metadata();
    expect(meta.id).toBe('gmail');
    expect(meta.connected).toBe(true);
    expect(meta.isMock).toBe(true);
    expect(meta.scopesGranted.length).toBeGreaterThan(0);
  });

  it('searches messages older than 5 years', async () => {
    const res = await adapter.searchMessages({ olderThanYears: 5 });
    // Seeded data has 6 messages older than 5 years (3 promo, 1 tax, 1 starred, 1 receipt)
    expect(res.messages.length).toBe(6);
    expect(res.totalEstimated).toBe(6);
  });

  it('moves messages to trash, updating labelIds and removing INBOX', async () => {
    const targetId = 'msg_001_old_promo';
    const before = await adapter.getMessageDetails(targetId);
    expect(before?.labelIds).toContain('INBOX');
    expect(before?.labelIds).not.toContain('TRASH');

    const result = await adapter.trashMessages([targetId]);
    expect(result.succeededCount).toBe(1);
    expect(result.failedCount).toBe(0);

    const after = await adapter.getMessageDetails(targetId);
    expect(after?.labelIds).toContain('TRASH');
    expect(after?.labelIds).not.toContain('INBOX');
  });

  it('archives messages by removing INBOX label', async () => {
    const targetId = 'msg_002_old_social';
    const result = await adapter.archiveMessages([targetId]);
    expect(result.succeededCount).toBe(1);

    const after = await adapter.getMessageDetails(targetId);
    expect(after?.labelIds).not.toContain('INBOX');
  });

  it('handles disconnect and reconnect states', async () => {
    await adapter.disconnect();
    expect(await adapter.isConnected()).toBe(false);

    await expect(adapter.searchMessages({})).rejects.toThrow('not connected');

    await adapter.reconnect();
    expect(await adapter.isConnected()).toBe(true);
    const res = await adapter.searchMessages({});
    expect(res.messages.length).toBeGreaterThan(0);
  });
});
