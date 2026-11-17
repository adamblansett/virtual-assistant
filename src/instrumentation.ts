/**
 * Next.js Server Instrumentation Hook.
 *
 * Executed once when the Next.js server instance initializes:
 * 1. Initializes encrypted persistent storage (`AppStorage`)
 * 2. Recovers any interrupted durable jobs from the last server run (`JobManager`)
 * 3. Starts the headless background cron scheduler daemon (`BackgroundSchedulerService`)
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV !== 'test') {
    const { AppStorage } = await import('@/lib/storage/db');
    const { JobManager } = await import('@/lib/jobs/queue');
    const { BackgroundSchedulerService } = await import('@/lib/services/scheduler');

    AppStorage.initialize();
    JobManager.initialize();
    BackgroundSchedulerService.startDaemon(60000);
  }
}
