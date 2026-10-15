import { describe, it, expect, beforeEach } from 'vitest';
import { JobManager } from '@/lib/jobs/queue';
import { TaskPlan } from '@/types';

describe('Durable Job Queue & Restart Recovery', () => {
  beforeEach(() => {
    JobManager.clear();
  });

  const dummyPlan: TaskPlan = {
    id: 'plan_test_job',
    userRequestId: 'req_1',
    originalPrompt: 'Process 100 emails in background',
    summary: 'Process batch emails',
    status: 'proposed',
    actions: [
      {
        id: 'act_1',
        integration: 'gmail',
        toolName: 'gmail_search',
        arguments: {},
        requiredPermission: 'gmail.readonly',
        targetResource: 'gmail:search',
        expectedOutcome: 'Search',
        riskLevel: 'read',
        approvalRequired: false,
        status: 'proposed',
        verificationStatus: 'pending',
        retryCount: 0
      },
      {
        id: 'act_2',
        integration: 'gmail',
        toolName: 'gmail_trash_messages',
        arguments: { messageIds: ['m1'] },
        requiredPermission: 'gmail.modify',
        targetResource: 'gmail:trash',
        expectedOutcome: 'Trash',
        riskLevel: 'reversible_write',
        approvalRequired: true,
        status: 'awaiting_approval',
        verificationStatus: 'pending',
        retryCount: 0
      }
    ],
    requiresUserConfirmation: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  it('enqueues a job and tracks progress through step checkpoints', () => {
    const job = JobManager.enqueueJob(dummyPlan);
    expect(job.id).toBeDefined();
    expect(job.totalSteps).toBe(2);
    expect(job.progressPercent).toBe(0);

    // Record Step 1 checkpoint
    JobManager.recordCheckpoint(job.id, {
      stepIndex: 0,
      actionId: 'act_1',
      toolName: 'gmail_search',
      status: 'succeeded',
      timestamp: new Date().toISOString(),
      summary: 'Search completed'
    });

    const step1Job = JobManager.getJob(job.id);
    expect(step1Job?.checkpoints.length).toBe(1);
    expect(step1Job?.progressPercent).toBe(50);

    // Record Step 2 checkpoint & success
    JobManager.recordCheckpoint(job.id, {
      stepIndex: 1,
      actionId: 'act_2',
      toolName: 'gmail_trash_messages',
      status: 'succeeded',
      timestamp: new Date().toISOString(),
      summary: 'Trash completed'
    });
    JobManager.updateStatus(job.id, 'succeeded');

    const finishedJob = JobManager.getJob(job.id);
    expect(finishedJob?.status).toBe('succeeded');
    expect(finishedJob?.progressPercent).toBe(100);
  });

  it('allows job cancellation', () => {
    const job = JobManager.enqueueJob(dummyPlan);
    const cancelled = JobManager.cancelJob(job.id);
    expect(cancelled).toBe(true);

    const updated = JobManager.getJob(job.id);
    expect(updated?.status).toBe('cancelled');
  });

  it('recovers running jobs across server restarts safely', () => {
    const job = JobManager.enqueueJob(dummyPlan);
    JobManager.updateStatus(job.id, 'running');

    // Simulate server restart recovery invocation
    JobManager.recoverInterruptedJobs();

    const recovered = JobManager.getJob(job.id);
    expect(recovered?.status).toBe('awaiting_approval');
    expect(recovered?.error).toContain('interrupted by server restart');
  });
});
