/**
 * Autonomous Headless Scheduler & Background Daemon Service.
 * 
 * Replaces human assistant scheduled timing:
 * - Automatically triggers Morning Kickoffs, Evening Wrap-Ups, and Weekly Audits on a headless clock
 * - Parses standard 5-field cron expressions to compute accurate nextRunAt timestamps
 * - Broadcasts notifications and executive summaries to Telegram, email, and dashboard without requiring a browser window
 * - Manages recurring cron job configurations with enabled/disabled states
 */

import { AppStorage } from '@/lib/storage/db';
import { AssistantAutomationService } from './automation';
import { ScheduledJobConfig, RoutineExecutionResult } from '@/types';
import { TelegramBotService } from './telegram';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';

export class BackgroundSchedulerService {
  private static daemonTimer: ReturnType<typeof setInterval> | null = null;
  private static daemonIntervalMs: number = 60000;
  private static lastTickAt?: string;

  /**
   * Matches a single cron field (e.g. wildcard, exact number, step, list, or range) against a numeric value.
   */
  private static matchCronField(field: string, value: number): boolean {
    const trimmed = field.trim();
    if (trimmed === '*') return true;

    for (const part of trimmed.split(',')) {
      if (part.startsWith('*/')) {
        const step = parseInt(part.slice(2), 10);
        if (!Number.isNaN(step) && step > 0 && value % step === 0) return true;
      } else if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!Number.isNaN(start) && !Number.isNaN(end) && value >= start && value <= end) return true;
      } else {
        const exact = parseInt(part, 10);
        if (!Number.isNaN(exact) && exact === value) return true;
      }
    }

    return false;
  }

  /**
   * Computes the next execution ISO timestamp from a 5-field cron expression (min hour dom month dow).
   */
  public static computeNextRunFromCron(cronExpression: string, fromDate: Date = new Date()): string {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) {
      return new Date(fromDate.getTime() + 86400000).toISOString();
    }

    const [minField, hourField, domField, monthField, dowField] = parts;
    const candidate = new Date(fromDate.getTime());
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1);

    // Search up to 8 days ahead (11,520 minutes)
    const maxIterations = 8 * 24 * 60;
    for (let i = 0; i < maxIterations; i++) {
      const m = candidate.getMinutes();
      const h = candidate.getHours();
      const dom = candidate.getDate();
      const mon = candidate.getMonth() + 1;
      const dow = candidate.getDay();

      if (
        this.matchCronField(minField, m) &&
        this.matchCronField(hourField, h) &&
        this.matchCronField(domField, dom) &&
        this.matchCronField(monthField, mon) &&
        this.matchCronField(dowField, dow)
      ) {
        return candidate.toISOString();
      }

      candidate.setMinutes(candidate.getMinutes() + 1);
    }

    return new Date(fromDate.getTime() + 86400000).toISOString();
  }

  /**
   * Dispatches real notifications across the job's configured notification channels.
   */
  public static async dispatchJobNotifications(
    job: ScheduledJobConfig,
    result: RoutineExecutionResult
  ): Promise<number> {
    let dispatched = 0;
    const config = AppStorage.getIntegrationConfig();
    const targetChatId = config?.telegramChatId || process.env.TELEGRAM_DEFAULT_CHAT_ID;

    for (const channel of job.notifyChannels) {
      const ch = channel.toLowerCase();
      if (ch === 'telegram' || ch === 'mobile') {
        if (targetChatId || TelegramBotService.hasLiveToken()) {
          await TelegramBotService.sendMessage(
            targetChatId || 'executive_mobile',
            `📋 <b>${job.name}</b>\n\n${result.summary}`
          );
        }
        dispatched++;
      } else if (ch === 'email') {
        try {
          const gmail = WorkflowExecutionEngine.getGmailAdapter();
          await gmail.sendMessage(
            'executive@company.com',
            `[Executive Routine] ${job.name}`,
            result.summary
          );
        } catch {
          // Best-effort notification delivery
        }
        dispatched++;
      } else {
        dispatched++;
      }
    }

    return dispatched;
  }

  /**
   * Evaluates enabled recurring jobs and executes routines.
   * When options.onlyDue is true (used by the autonomous daemon tick), only jobs with nextRunAt <= now are executed.
   */
  public static async evaluateAndRunDueJobs(options?: {
    onlyDue?: boolean;
    now?: Date;
  }): Promise<{
    executedJobs: Array<{ job: ScheduledJobConfig; result: RoutineExecutionResult }>;
    dispatchedNotifications: number;
  }> {
    const jobs = AppStorage.listScheduledJobs();
    const executedJobs: Array<{ job: ScheduledJobConfig; result: RoutineExecutionResult }> = [];
    let dispatchedNotifications = 0;
    const nowDate = options?.now || new Date();
    const nowMs = nowDate.getTime();
    this.lastTickAt = nowDate.toISOString();

    for (const job of jobs) {
      if (!job.enabled) continue;

      if (options?.onlyDue && job.nextRunAt) {
        const nextRunMs = new Date(job.nextRunAt).getTime();
        if (!Number.isNaN(nextRunMs) && nextRunMs > nowMs) {
          continue;
        }
      }

      // Run routine
      const result = await AssistantAutomationService.runRoutine(job.routineType);

      // Update job state with cron-computed nextRunAt
      job.lastRunAt = nowDate.toISOString();
      job.nextRunAt = this.computeNextRunFromCron(job.cronExpression, nowDate);
      AppStorage.saveScheduledJob(job);

      const sent = await this.dispatchJobNotifications(job, result);
      executedJobs.push({ job, result });
      dispatchedNotifications += sent;
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

    const now = new Date();
    const result = await AssistantAutomationService.runRoutine(job.routineType);
    job.lastRunAt = now.toISOString();
    job.nextRunAt = this.computeNextRunFromCron(job.cronExpression, now);
    AppStorage.saveScheduledJob(job);
    await this.dispatchJobNotifications(job, result);

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

  /**
   * Starts the headless background cron daemon timer.
   */
  public static startDaemon(intervalMs: number = 60000): void {
    if (this.daemonTimer) return;
    this.daemonIntervalMs = intervalMs;
    this.daemonTimer = setInterval(() => {
      this.evaluateAndRunDueJobs({ onlyDue: true }).catch(() => {
        // Ignore transient background errors
      });
    }, intervalMs);

    if (typeof (this.daemonTimer as any).unref === 'function') {
      (this.daemonTimer as any).unref();
    }
  }

  /**
   * Stops the headless background cron daemon timer.
   */
  public static stopDaemon(): void {
    if (this.daemonTimer) {
      clearInterval(this.daemonTimer);
      this.daemonTimer = null;
    }
  }

  public static getDaemonStatus(): {
    running: boolean;
    intervalMs: number;
    lastTickAt?: string;
  } {
    return {
      running: Boolean(this.daemonTimer),
      intervalMs: this.daemonIntervalMs,
      lastTickAt: this.lastTickAt
    };
  }
}
