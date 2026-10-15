import { describe, it, expect, beforeEach } from 'vitest';
import { TaskPlanner } from '@/lib/planner/planner';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { MockAIProvider } from '@/lib/ai/mock';
import { UserPreferencesSchema } from '@/types';
import { AppStorage } from '@/lib/storage/db';

describe('WorkflowExecutionEngine - End-to-End Workflow Verification', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('executes full email cleanup lifecycle with approval and authoritative verification', async () => {
    const prefs = UserPreferencesSchema.parse({});
    const aiProvider = new MockAIProvider();
    const planner = new TaskPlanner(aiProvider, prefs);

    // 1. User submits request: "Find emails older than five years that I no longer need and clean them up."
    const plan = await planner.createPlan('Find emails older than five years that I no longer need and clean them up.');
    expect(plan.actions.length).toBe(3);
    expect(plan.actions[0].toolName).toBe('gmail_preview_cleanup');
    expect(plan.actions[1].toolName).toBe('gmail_trash_messages');
    expect(plan.actions[2].toolName).toBe('gmail_verify_trash_state');

    // 2. Initial execution without approval:
    // Should execute step 1 (preview) and pause before step 2 (trash) in 'awaiting_approval'
    const initialRun = await WorkflowExecutionEngine.executePlan(plan, false);
    expect(initialRun.plan.status).toBe('awaiting_approval');
    expect(initialRun.plan.actions[0].status).toBe('succeeded');
    expect(initialRun.plan.actions[1].status).toBe('awaiting_approval');
    expect(initialRun.plan.affectedResourcePreview?.count).toBe(3); // 3 qualifying old promos
    expect(initialRun.summary.succeeded).toBe(1);

    // 3. User grants authorization for the bulk trash operation
    const approvedRun = await WorkflowExecutionEngine.executePlan(initialRun.plan, true);

    // 4. Verification: all actions succeed and state is verified on provider
    expect(approvedRun.plan.status).toBe('succeeded');
    expect(approvedRun.plan.actions[1].status).toBe('succeeded');
    expect(approvedRun.plan.actions[2].status).toBe('succeeded');
    expect(approvedRun.plan.actions[2].verificationStatus).toBe('verified');

    // 5. Accurate reporting
    expect(approvedRun.summary.totalActions).toBe(3);
    expect(approvedRun.summary.succeeded).toBe(3);
    expect(approvedRun.summary.failed).toBe(0);
    expect(approvedRun.summary.verified).toBeGreaterThan(0);
  });
});
