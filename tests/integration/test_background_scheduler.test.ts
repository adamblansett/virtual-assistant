import { describe, it, expect, beforeEach } from 'vitest';
import { BackgroundSchedulerService } from '@/lib/services/scheduler';
import { AppStorage } from '@/lib/storage/db';

describe('Autonomous Headless Background Scheduler Service', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('lists configured recurring cron jobs and routines', () => {
    const jobs = AppStorage.listScheduledJobs();
    expect(jobs.length).toBeGreaterThanOrEqual(3);

    const morning = jobs.find(j => j.routineType === 'morning_briefing');
    expect(morning).toBeDefined();
    expect(morning?.enabled).toBe(true);
    expect(morning?.cronExpression).toBe('0 7 * * *');

    const evening = jobs.find(j => j.routineType === 'evening_wrapup');
    expect(evening).toBeDefined();

    const audit = jobs.find(j => j.routineType === 'weekly_audit');
    expect(audit).toBeDefined();
  });

  it('toggles scheduled job enabled status safely', () => {
    const toggled = BackgroundSchedulerService.toggleJob('job_morning');
    expect(toggled.enabled).toBe(false);

    const retrieved = AppStorage.getScheduledJob('job_morning');
    expect(retrieved?.enabled).toBe(false);

    // Toggle back
    const toggledBack = BackgroundSchedulerService.toggleJob('job_morning');
    expect(toggledBack.enabled).toBe(true);
  });

  it('manually triggers a scheduled routine on demand', async () => {
    const runResult = await BackgroundSchedulerService.triggerJob('job_morning');

    expect(runResult.job.id).toBe('job_morning');
    expect(runResult.job.lastRunAt).toBeDefined();
    expect(runResult.result.status).toBe('succeeded');
    expect(runResult.result.summary).toContain('Morning Routine Completed');
  });

  it('evaluates and executes all enabled recurring jobs, updating execution timestamps', async () => {
    const evalResult = await BackgroundSchedulerService.evaluateAndRunDueJobs();

    expect(evalResult.executedJobs.length).toBeGreaterThanOrEqual(3);
    expect(evalResult.dispatchedNotifications).toBeGreaterThan(0);

    for (const item of evalResult.executedJobs) {
      expect(item.result.status).toBe('succeeded');
      expect(item.job.lastRunAt).toBeDefined();
      expect(item.job.nextRunAt).toBeDefined();
    }
  });
});
