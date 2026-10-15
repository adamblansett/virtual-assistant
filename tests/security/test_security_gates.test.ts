import { describe, it, expect, beforeEach } from 'vitest';
import { TaskPlanner } from '@/lib/planner/planner';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { MockAIProvider } from '@/lib/ai/mock';
import { UserPreferencesSchema } from '@/types';
import { AppStorage } from '@/lib/storage/db';
import { SecretRedactor } from '@/lib/security/crypto';
import { AuditLogger } from '@/lib/audit/logger';
import { IdempotencyManager } from '@/lib/engine/idempotency';

describe('SecurityGates - Enforcement, Redaction, and Idempotency', () => {
  beforeEach(() => {
    AppStorage.reset();
    AuditLogger.clear();
    IdempotencyManager.clear();
  });

  it('redacts sensitive headers, access tokens, and passwords from logs', () => {
    const sensitivePayload = {
      user: 'alice',
      password: 'supersecretpassword123',
      token: 'ya29.a0AfH6SM...',
      authorization: 'Bearer secret_access_token_xyz',
      nested: {
        api_key: 'AIzaSyD-123456789',
        publicNote: 'This is visible'
      }
    };

    const redacted = SecretRedactor.redact(sensitivePayload);
    expect(redacted.user).toBe('alice');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.authorization).toBe('[REDACTED]');
    expect(redacted.nested.api_key).toBe('[REDACTED]');
    expect(redacted.nested.publicNote).toBe('This is visible');
  });

  it('prevents duplicate execution of actions using idempotency key', async () => {
    const key = IdempotencyManager.generateKey('gmail_trash_messages', { messageIds: ['msg_001'] });
    const started = IdempotencyManager.startAction(key, 'act_1');
    expect(started).toBe(true);

    IdempotencyManager.recordSuccess(key, { count: 1 });

    // Second execution attempt with identical parameters must be rejected
    const secondAttempt = IdempotencyManager.startAction(key, 'act_2');
    expect(secondAttempt).toBe(false);
  });

  it('strictly blocks consequential actions if user denies approval', async () => {
    const prefs = UserPreferencesSchema.parse({});
    const aiProvider = new MockAIProvider();
    const planner = new TaskPlanner(aiProvider, prefs);

    const plan = await planner.createPlan('Send an email to colleague');
    expect(plan.actions[0].toolName).toBe('gmail_send_message');
    expect(plan.actions[0].riskLevel).toBe('consequential');

    // Attempting to execute with isUserApproved = false must halt in awaiting_approval
    const run = await WorkflowExecutionEngine.executePlan(plan, false);
    expect(run.plan.status).toBe('awaiting_approval');
    expect(run.plan.actions[0].status).toBe('awaiting_approval');
    expect(run.summary.succeeded).toBe(0);
  });
});
