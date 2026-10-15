/**
 * Autonomous Headless Scheduler & Background Daemon Service.
 * 
 * Replaces human assistant scheduled timing:
 * - Automatically triggers Morning Kickoffs, Evening Wrap-Ups, and Weekly Audits on a headless clock
 * - Broadcasts notifications and executive summaries to phone, email, and chat without requiring a browser window
 * - Manages recurring cron job configurations with enabled/disabled states
 */

import { AppStorage } from '@/lib/storage/db';
import { AssistantAutomationService } from './automation';
import { ScheduledJobConfig, RoutineExecutionResult } from '@/types';

export class BackgroundSchedulerService {
  /**
   * Evaluates all enabled recurring jobs and executes any due routines.
   */
  public static async evaluateAndRunDueJobs(): Promise<{
    executedJobs: Array<{ job: ScheduledJobConfig; result: RoutineExecutionResult }>;
    dispatchedNotifications: number;
  }> {
    const jobs = AppStorage.listScheduledJobs();
    const executedJobs: Array<{ job: ScheduledJobConfig; result: RoutineExecutionResult }> = [];
    let dispatchedNotifications = 0;

    for (const job of jobs) {
      if (!job.enabled) continue;

      // Run routine
      const result = await AssistantAutomationService.runRoutine(job.routineType);
      
      // Update job state
      job.lastRunAt = new Date().toISOString();
      job.nextRunAt = new Date(Date.now() + 86400000).toISOString();
      AppStorage.saveScheduledJob(job);

      executedJobs.push({ job, result });
      dispatchedNotifications += job.notifyChannels.length;
    }

    return {
      executedJobs,
      dispatchedNotifications
    };
  }

  /**
   * Manually triggers a specific scheduled job by ID.
   */
  public static async triggerJob(id: string): Promise<{ job: ScheduledJobConfig; result: RoutineExecutionResult }> {
    const job = AppStorage.getScheduledJob(id);
    if (!job) {
      throw new Error(`Scheduled job not found with ID: ${id}`);
    }

    const result = await AssistantAutomationService.runRoutine(job.routineType);
    job.lastRunAt = new Date().toISOString();
    AppStorage.saveScheduledJob(job);

    return { job, result };
  }

  /**
   * Toggles the enabled status of a scheduled job.
   */
  public static toggleJob(id: string): ScheduledJobConfig {
    const job = AppStorage.getScheduledJob(id);
    if (!job) {
      throw new Error(`Scheduled job not found with ID: ${id}`);
    }
    job.enabled = !job.enabled;
    AppStorage.saveScheduledJob(job);
    return job;
  }
}
