import { z } from 'zod';
import { TaskPlan } from '@/types';

export const JobStatusSchema = z.enum([
  'queued',
  'running',
  'awaiting_approval',
  'succeeded',
  'partially_succeeded',
  'failed',
  'cancelled'
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export interface JobCheckpoint {
  stepIndex: number;
  actionId: string;
  toolName: string;
  status: string;
  timestamp: string;
  summary?: string;
  result?: any;
}

export interface JobRecord {
  id: string;
  planId: string;
  plan: TaskPlan;
  status: JobStatus;
  totalSteps: number;
  currentStepIndex: number;
  progressPercent: number;
  checkpoints: JobCheckpoint[];
  retriesRemaining: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
