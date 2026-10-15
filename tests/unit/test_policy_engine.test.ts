import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '@/lib/policy/engine';
import { PlannedAction, UserPreferencesSchema } from '@/types';

describe('PolicyEngine - Authorization and Protection Rules', () => {
  const defaultPrefs = UserPreferencesSchema.parse({});

  it('strictly rejects high-risk actions', () => {
    const highRiskAction: PlannedAction = {
      id: 'act_1',
      integration: 'system',
      toolName: 'shell_execute',
      arguments: { command: 'rm -rf /' },
      requiredPermission: 'system.shell',
      targetResource: 'system',
      expectedOutcome: 'Run shell command',
      riskLevel: 'high_risk',
      approvalRequired: true,
      status: 'proposed',
      verificationStatus: 'pending',
      retryCount: 0
    };

    const res = PolicyEngine.evaluateAction(highRiskAction, defaultPrefs, true);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('disabled by default');
  });

  it('requires explicit human approval for consequential send actions', () => {
    const sendAction: PlannedAction = {
      id: 'act_send',
      integration: 'gmail',
      toolName: 'gmail_send_message',
      arguments: { to: 'bob@example.com', subject: 'Hi', body: 'Test' },
      requiredPermission: 'gmail.send',
      targetResource: 'gmail:send',
      expectedOutcome: 'Send email',
      riskLevel: 'consequential',
      approvalRequired: true,
      status: 'proposed',
      verificationStatus: 'pending',
      retryCount: 0
    };

    // Unapproved attempt must be gated
    const denied = PolicyEngine.evaluateAction(sendAction, defaultPrefs, false);
    expect(denied.allowed).toBe(false);
    expect(denied.requiresApproval).toBe(true);

    // Explicitly approved attempt is allowed
    const approved = PolicyEngine.evaluateAction(sendAction, defaultPrefs, true);
    expect(approved.allowed).toBe(true);
    expect(approved.requiresApproval).toBe(false);
  });

  it('auto-approves read operations when preference permits', () => {
    const readAction: PlannedAction = {
      id: 'act_read',
      integration: 'gmail',
      toolName: 'gmail_search',
      arguments: { query: 'older_than:5y' },
      requiredPermission: 'gmail.readonly',
      targetResource: 'gmail:search',
      expectedOutcome: 'Search emails',
      riskLevel: 'read',
      approvalRequired: false,
      status: 'proposed',
      verificationStatus: 'pending',
      retryCount: 0
    };

    const res = PolicyEngine.evaluateAction(readAction, defaultPrefs, false);
    expect(res.allowed).toBe(true);
  });

  it('filters out protected categories (tax, legal, receipts, starred) from email cleanup', () => {
    const testMessages = [
      { id: '1', subject: 'Weekly Newsletter Deal', sender: 'news@deals.com', labelIds: ['INBOX'] },
      { id: '2', subject: 'Your Official 1099 Tax Form', sender: 'noreply@irs.gov', labelIds: ['INBOX'] },
      { id: '3', subject: 'Your Monthly Chase Receipt', sender: 'service@chase.com', labelIds: ['INBOX'] },
      { id: '4', subject: 'Important Life Advice', sender: 'mentor@school.edu', labelIds: ['INBOX', 'STARRED'] }
    ];

    const { safeMessages, protectedMessages } = PolicyEngine.filterProtectedMessages(testMessages, defaultPrefs);

    expect(safeMessages.length).toBe(1);
    expect(safeMessages[0].id).toBe('1');

    expect(protectedMessages.length).toBe(3);
    const protectedIds = protectedMessages.map(m => m.id);
    expect(protectedIds).toContain('2'); // tax
    expect(protectedIds).toContain('3'); // receipt
    expect(protectedIds).toContain('4'); // starred
  });
});
