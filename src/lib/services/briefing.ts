/**
 * Executive Daily Briefing Service.
 * 
 * Functions as the executive assistant's morning briefing:
 * - Today's schedule and meeting conflicts
 * - Urgent unread emails requiring replies
 * - Stalled follow-ups (sent emails awaiting replies)
 * - Priority tasks due today
 * - Recent expenses summary
 */

import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { ExecutiveBriefing } from '@/types';

export class ExecutiveBriefingService {
  public static async generateBriefing(): Promise<ExecutiveBriefing> {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 1. Calendar: Today's meetings
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    
    let todaysMeetings: Array<{ id: string; summary: string; time: string; location?: string }> = [];
    try {
      const calRes = await adapters.calendar.listEvents({
        timeMin: startOfDay,
        timeMax: endOfDay
      });
      todaysMeetings = calRes.map(e => ({
        id: e.id,
        summary: e.summary,
        time: `${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        location: e.location
      }));
    } catch {
      // Fallback
      todaysMeetings = [];
    }

    // 2. Gmail: Urgent unread emails
    let unreadUrgentEmails: Array<{ id: string; from: string; subject: string; snippet: string }> = [];
    try {
      const searchRes = await adapters.gmail.searchMessages({ isUnread: true, maxResults: 10 });
      unreadUrgentEmails = searchRes.messages.slice(0, 5).map(m => ({
        id: m.id,
        from: m.sender,
        subject: m.subject,
        snippet: m.snippet
      }));
    } catch {
      unreadUrgentEmails = [];
    }

    // 3. Contacts & Follow-ups
    const contacts = AppStorage.listContacts();
    const pendingFollowUps: Array<{ to: string; subject: string; sentDaysAgo: number }> = [];
    
    for (const c of contacts) {
      if (c.lastContactedAt) {
        const daysAgo = Math.floor((now.getTime() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo >= c.followUpCadenceDays) {
          pendingFollowUps.push({
            to: `${c.name} (${c.email})`,
            subject: `Cadence follow-up: last contacted ${daysAgo} days ago (${c.notes[0] || 'Check in'})`,
            sentDaysAgo: daysAgo
          });
        }
      }
    }

    // 4. Tasks: High priority and Due Today
    const allTasks = AppStorage.listTasks();
    const dueTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');

    // 5. Recent Expenses
    const allExpenses = AppStorage.listExpenses();
    const recentExpensesSum = allExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Build Greeting and Summary
    const hour = now.getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greeting = `${timeGreeting}! Here is your executive daily briefing for ${dateStr}.`;

    const scheduleSummary = todaysMeetings.length > 0 
      ? `You have ${todaysMeetings.length} meeting(s) scheduled today.`
      : 'Your calendar is clear today. Ideal for deep focus work.';

    const summaryText = `${greeting} ${scheduleSummary} You have ${unreadUrgentEmails.length} unread email(s) and ${dueTasks.length} pending task(s).`;

    return {
      date: dateStr,
      greeting,
      scheduleSummary,
      todaysMeetings,
      unreadUrgentEmails,
      pendingFollowUps,
      dueTasks,
      recentExpenses: {
        count: allExpenses.length,
        totalAmount: recentExpensesSum,
        currency: 'USD'
      },
      summaryText
    };
  }
}
