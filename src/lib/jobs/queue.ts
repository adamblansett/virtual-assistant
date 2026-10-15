/**
 * Durable Job Queue & Restart Recovery Manager.
 * Persists long-running tasks, maintains checkpoints, and resumes interrupted workflows.
 */

import fs from 'fs';
import path from 'path';
import { TaskPlan } from '@/types';
import { JobRecord, JobCheckpoint, JobStatus } from './types';

export class JobManager {
  private static filePath = path.join(process.cwd(), 'data', 'jobs_state.json');
  private static jobs: Map<string, JobRecord> = new Map();
  private static initialized: boolean = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const list: JobRecord[] = JSON.parse(raw);
        for (const job of list) {
          this.jobs.set(job.id, job);
        }
      }
    } catch {
      // Fallback in-memory
    }

    // Server restart recovery check
    this.recoverInterruptedJobs();
  }

  private static save(): void {
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const list = Array.from(this.jobs.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch {
      // Best effort save
    }
  }

  /**
   * Scans for any job that was in 'running' state during a server restart,
   * checkpoints its interruption, and marks it as awaiting recovery or pauses it safely.
   */
  public static recoverInterruptedJobs(): void {
    for (const job of this.jobs.values()) {
      if (job.status === 'running') {
        job.status = 'awaiting_approval';
        job.error = 'Workflow was interrupted by server restart. Ready to safely resume from checkpoint.';
        job.updatedAt = new Date().toISOString();
      }
    }
    this.save();
  }

  public static enqueueJob(plan: TaskPlan): JobRecord {
    this.initialize();

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const job: JobRecord = {
      id: jobId,
      planId: plan.id,
      plan,
      status: plan.status === 'awaiting_approval' ? 'awaiting_approval' : 'queued',
      totalSteps: plan.actions.length,
      currentStepIndex: 0,
      progressPercent: 0,
      checkpoints: [],
      retriesRemaining: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.jobs.set(jobId, job);
    this.save();
    return job;
  }

  public static getJob(id: string): JobRecord | null {
    this.initialize();
    return this.jobs.get(id) || null;
  }

  public static listJobs(): JobRecord[] {
    this.initialize();
    return Array.from(this.jobs.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static recordCheckpoint(jobId: string, checkpoint: JobCheckpoint): void {
    this.initialize();
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.checkpoints.push(checkpoint);
    job.currentStepIndex = checkpoint.stepIndex + 1;
    job.progressPercent = Math.round((job.currentStepIndex / Math.max(1, job.totalSteps)) * 100);
    job.updatedAt = new Date().toISOString();
    this.save();
  }

  public static updateStatus(jobId: string, status: JobStatus, error?: string): void {
    this.initialize();
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    if (error) job.error = error;
    if (status === 'succeeded') job.progressPercent = 100;
    job.updatedAt = new Date().toISOString();
    this.save();
  }

  public static cancelJob(jobId: string): boolean {
    this.initialize();
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.status = 'cancelled';
    job.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  public static clear(): void {
    this.jobs.clear();
    this.save();
  }
}
