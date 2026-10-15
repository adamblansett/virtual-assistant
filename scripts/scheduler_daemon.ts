/**
 * Autonomous Executive Assistant Background Daemon.
 * 
 * Standalone entrypoint for running the assistant as an autonomous systemd or Docker background process.
 * Periodically wakes up, evaluates scheduled jobs, triggers executive routines, and broadcasts updates.
 */

import { BackgroundSchedulerService } from '../src/lib/services/scheduler';

async function runDaemonIteration() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Executive Assistant Daemon: Checking scheduled jobs...`);

  try {
    const outcome = await BackgroundSchedulerService.evaluateAndRunDueJobs();
    console.log(`[${timestamp}] Daemon: Executed ${outcome.executedJobs.length} job(s), dispatched ${outcome.dispatchedNotifications} notification(s).`);
  } catch (err: any) {
    console.error(`[${timestamp}] Daemon error:`, err.message);
  }
}

// In standalone execution, this can run continuously or as a cron single-shot
if (require.main === module) {
  runDaemonIteration().then(() => {
    console.log('Daemon iteration complete.');
    process.exit(0);
  });
}

export { runDaemonIteration };
