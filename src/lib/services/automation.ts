/**
 * Proactive Automation & Recurring Routine Service.
 * 
 * Replaces human assistant routine schedules:
 * - Morning Kickoff: Synthesizes briefing, unread triage, and daily agenda
 * - Evening Wrap-Up: Audits completed vs rollover tasks, previews tomorrow's schedule
 * - Weekly Executive Audit: Cadence follow-up audit and weekly spending reconciliation
 */

import { ExecutiveBriefingService } from './briefing';
import { InboxTriageService } from './inbox_triage';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { AppStorage } from '@/lib/storage/db';
import { AssistantRoutineType, RoutineExecutionResult } from '@/types';

export class AssistantAutomationService {
  /**
   * Executes a scheduled or triggered executive assistant routine.
   */
  public static async runRoutine(routineType: AssistantRoutineType): Promise<RoutineExecutionResult> {
    const executedAt = new Date().toISOString();
    const id = `rtn_${routineType}_${Date.now()}`;

    switch (routineType) {
      case 'morning_briefing': {
        const briefing = await ExecutiveBriefingService.generateBriefing();
        const triage = await InboxTriageService.triageInbox();

        const summary = `Morning Routine Completed: ${briefing.todaysMeetings.length} meeting(s) scheduled today. ${triage.needsActionCount} email(s) require action. ${briefing.dueTasks.length} task(s) on the docket.`;

        const result: RoutineExecutionResult = {
          id,
          routineType,
          executedAt,
          status: 'succeeded',
          summary,
          generatedArtifacts: {
            briefing,
            triageSummary: {
              total: triage.totalAnalyzed,
              needsAction: triage.needsActionCount,
              finance: triage.financeCount
            }
          }
        };

        AppStorage.saveRoutineResult(result);
        return result;
      }

      case 'evening_wrapup': {
        const tasks = AppStorage.listTasks();
        const completedToday = tasks.filter(t => t.status === 'completed');
        const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress');

        const adapters = WorkflowExecutionEngine.getAdaptersBundle();
        const now = new Date();
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0).toISOString();
        const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59).toISOString();

        let tomorrowMeetings: Array<{ id: string; summary: string; time: string }> = [];
        try {
          const events = await adapters.calendar.listEvents({
            timeMin: tomorrowStart,
            timeMax: tomorrowEnd
          });
          tomorrowMeetings = events.map(e => ({
            id: e.id,
            summary: e.summary,
            time: `${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          }));
        } catch {
          tomorrowMeetings = [];
        }

        const summary = `Evening Wrap-Up Completed: ${completedToday.length} task(s) completed today. ${pendingTasks.length} task(s) rolling over. Tomorrow has ${tomorrowMeetings.length} scheduled meeting(s).`;

        const result: RoutineExecutionResult = {
          id,
          routineType,
          executedAt,
          status: 'succeeded',
          summary,
          generatedArtifacts: {
            completedCount: completedToday.length,
            rolloverCount: pendingTasks.length,
            tomorrowCommitments: tomorrowMeetings
          }
        };

        AppStorage.saveRoutineResult(result);
        return result;
      }

      case 'weekly_audit': {
        const contacts = AppStorage.listContacts();
        const expenses = AppStorage.listExpenses();
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const now = new Date().getTime();
        const stalledContacts = contacts.filter(c => {
          if (!c.lastContactedAt) return false;
          const daysAgo = Math.floor((now - new Date(c.lastContactedAt).getTime()) / 86400000);
          return daysAgo >= c.followUpCadenceDays;
        });

        const summary = `Weekly Executive Audit Completed: ${stalledContacts.length} VIP contact(s) overdue for relationship touchpoints. Total recorded spend to date: $${totalExpenses.toFixed(2)} USD.`;

        const result: RoutineExecutionResult = {
          id,
          routineType,
          executedAt,
          status: 'succeeded',
          summary,
          generatedArtifacts: {
            stalledContactsCount: stalledContacts.length,
            stalledContacts: stalledContacts.map(c => ({ name: c.name, email: c.email, company: c.company })),
            overdueVIPs: stalledContacts.map(c => ({ name: c.name, email: c.email, company: c.company })),
            totalRecordedExpenses: totalExpenses,
            totalExpenses
          }
        };

        AppStorage.saveRoutineResult(result);
        return result;
      }

      default:
        throw new Error(`Unsupported routine type: ${routineType}`);
    }
  }

  /**
   * Lists past executed assistant routines.
   */
  public static listRoutineHistory(): RoutineExecutionResult[] {
    return AppStorage.listRoutineResults();
  }
}
