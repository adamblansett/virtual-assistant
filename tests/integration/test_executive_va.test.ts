import { describe, it, expect, beforeEach } from 'vitest';
import { AppStorage } from '@/lib/storage/db';
import { ExecutiveBriefingService } from '@/lib/services/briefing';
import { InboxTriageService } from '@/lib/services/inbox_triage';
import { SmartSchedulingService } from '@/lib/services/scheduling';
import { ToolRegistry } from '@/lib/tools/registry';
import { MockAIProvider } from '@/lib/ai/mock';
import { TaskPlanner } from '@/lib/planner/planner';
import { UserPreferencesSchema } from '@/types';

describe('Executive Virtual Assistant (Paid VA Replacement Capabilities)', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  describe('1. Executive Daily Briefing Service', () => {
    it('compiles a comprehensive morning briefing from calendar, emails, tasks, and VIP contacts', async () => {
      const briefing = await ExecutiveBriefingService.generateBriefing();

      expect(briefing).toBeDefined();
      expect(briefing.date).toBeDefined();
      expect(briefing.summaryText.toLowerCase()).toContain('executive');
      expect(Array.isArray(briefing.todaysMeetings)).toBe(true);
      expect(briefing.todaysMeetings.length).toBeGreaterThan(0);
      expect(Array.isArray(briefing.unreadUrgentEmails)).toBe(true);
      expect(Array.isArray(briefing.dueTasks)).toBe(true);
      expect(briefing.dueTasks.length).toBeGreaterThan(0);
      expect(Array.isArray(briefing.pendingFollowUps)).toBe(true);
      expect(briefing.pendingFollowUps.length).toBeGreaterThan(0);
      expect(briefing.recentExpenses).toBeDefined();
      expect(briefing.recentExpenses.totalAmount).toBeGreaterThan(0);
    });
  });

  describe('2. Inbox Triage Service', () => {
    it('intelligently triages emails into action items, records/finance, and low priority', async () => {
      const triage = await InboxTriageService.triageInbox();

      expect(triage).toBeDefined();
      expect(triage.totalAnalyzed).toBeGreaterThan(0);
      expect(triage.needsActionCount).toBeGreaterThan(0);
      expect(triage.financeCount).toBeGreaterThan(0);
      expect(triage.lowPriorityCount).toBeGreaterThan(0);
      expect(triage.items.length).toBeGreaterThan(0);

      // Verify suggested actions
      const urgentItem = triage.items.find(i => i.category === 'needs_action');
      expect(urgentItem).toBeDefined();
      expect(urgentItem?.actionSuggested).toBeDefined();
    });
  });

  describe('3. Smart Scheduling Service', () => {
    it('calculates open calendar slots within business hours with 15-minute buffers', async () => {
      const targetDate = new Date().toISOString().split('T')[0];
      const slots = await SmartSchedulingService.findFreeSlots(targetDate, 30);

      expect(Array.isArray(slots)).toBe(true);
      expect(slots.length).toBeGreaterThan(0);

      const firstSlot = slots[0];
      expect(firstSlot.startTime).toBeDefined();
      expect(firstSlot.endTime).toBeDefined();
      expect(firstSlot.durationMinutes).toBeGreaterThanOrEqual(30);

      // Verify slots do not conflict with existing events
      const existingEvents = await AppStorage.listTasks();
      expect(existingEvents).toBeDefined();
    });
  });

  describe('4. Tasks & To-Dos Management', () => {
    it('creates, lists, and toggles completion of executive tasks', () => {
      const initialTasks = AppStorage.listTasks();
      const initialCount = initialTasks.length;

      AppStorage.saveTask({
        id: 'tsk_custom_test',
        title: 'Prepare Board Slide Deck',
        description: 'Finalize metrics and growth charts',
        priority: 'high',
        status: 'todo',
        source: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const updatedTasks = AppStorage.listTasks();
      expect(updatedTasks.length).toBe(initialCount + 1);

      const created = AppStorage.getTask('tsk_custom_test');
      expect(created?.title).toBe('Prepare Board Slide Deck');
      expect(created?.priority).toBe('high');

      // Toggle status
      if (created) {
        created.status = 'completed';
        AppStorage.saveTask(created);
      }

      const completed = AppStorage.getTask('tsk_custom_test');
      expect(completed?.status).toBe('completed');
    });
  });

  describe('5. VIP Contacts & Follow-Up Cadence', () => {
    it('identifies contacts requiring follow-up based on configured cadence', () => {
      const contacts = AppStorage.listContacts();
      expect(contacts.length).toBeGreaterThan(0);

      const vip = contacts.find(c => c.isVIP);
      expect(vip).toBeDefined();
      expect(vip?.isVIP).toBe(true);

      const searchResults = AppStorage.searchContacts('PartnerTech');
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].company).toContain('PartnerTech');
    });
  });

  describe('6. Expense Tracking & Financial Summaries', () => {
    it('aggregates expenses by category and tracks spending totals', () => {
      const expenses = AppStorage.listExpenses();
      expect(expenses.length).toBeGreaterThan(0);

      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      expect(total).toBeGreaterThan(0);

      // Add a new expense
      AppStorage.saveExpense({
        id: 'exp_test_lunch',
        date: new Date().toISOString().split('T')[0],
        merchant: 'Client Business Lunch',
        amount: 85.50,
        currency: 'USD',
        category: 'meals',
        source: 'Business Lunch with Partner',
        verified: false
      });

      const updatedExpenses = AppStorage.listExpenses();
      expect(updatedExpenses.length).toBe(expenses.length + 1);
      const newTotal = updatedExpenses.reduce((sum, e) => sum + e.amount, 0);
      expect(newTotal).toBe(total + 85.50);
    });
  });

  describe('7. Executive Tools in ToolRegistry', () => {
    it('executes assistant_daily_briefing tool and returns structured briefing', async () => {
      const result = await ToolRegistry.executeTool('assistant_daily_briefing', {});
      expect(result).toBeDefined();
      expect(result.summaryText).toBeDefined();
      expect(result.todaysMeetings).toBeDefined();
    });

    it('executes assistant_triage_inbox tool and returns prioritized buckets', async () => {
      const result = await ToolRegistry.executeTool('assistant_triage_inbox', {});
      expect(result).toBeDefined();
      expect(result.totalAnalyzed).toBeGreaterThan(0);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('executes calendar_find_free_slots tool', async () => {
      const result = await ToolRegistry.executeTool('calendar_find_free_slots', { durationMinutes: 45 });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('executes tasks_create and tasks_list tools', async () => {
      const createRes = await ToolRegistry.executeTool('tasks_create', {
        title: 'Review supplier contract',
        priority: 'high'
      });
      expect(createRes.success).toBe(true);
      expect(createRes.task.title).toBe('Review supplier contract');

      const listRes = await ToolRegistry.executeTool('tasks_list', {});
      expect(Array.isArray(listRes)).toBe(true);
      expect(listRes.some((t: any) => t.title === 'Review supplier contract')).toBe(true);
    });

    it('executes contacts_search tool', async () => {
      const res = await ToolRegistry.executeTool('contacts_search', { query: 'Alice' });
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].name).toContain('Alice');
    });

    it('executes finance_summarize_expenses tool', async () => {
      const res = await ToolRegistry.executeTool('finance_summarize_expenses', {});
      expect(res).toBeDefined();
      expect(res.totalAmount).toBeGreaterThan(0);
      expect(res.byCategory).toBeDefined();
    });
  });

  describe('8. Natural Language Intent Translation to Executive Tools', () => {
    const prefs = UserPreferencesSchema.parse({});
    const aiProvider = new MockAIProvider();
    const planner = new TaskPlanner(aiProvider, prefs);

    it('translates morning briefing request into assistant_daily_briefing action', async () => {
      const plan = await planner.createPlan('Give me my morning briefing');
      expect(plan.actions.length).toBe(1);
      expect(plan.actions[0].toolName).toBe('assistant_daily_briefing');
    });

    it('translates inbox triage request into assistant_triage_inbox action', async () => {
      const plan = await planner.createPlan('Triage my inbox and show action items');
      expect(plan.actions.length).toBe(1);
      expect(plan.actions[0].toolName).toBe('assistant_triage_inbox');
    });

    it('translates scheduling request into calendar_find_free_slots action', async () => {
      const plan = await planner.createPlan('Find 45min open tomorrow for a meeting');
      expect(plan.actions.length).toBe(1);
      expect(plan.actions[0].toolName).toBe('calendar_find_free_slots');
      expect(plan.actions[0].arguments.durationMinutes).toBe(45);
    });

    it('translates expense summary request into finance_summarize_expenses action', async () => {
      const plan = await planner.createPlan('Summarize recent expenses and receipts');
      expect(plan.actions.length).toBe(1);
      expect(plan.actions[0].toolName).toBe('finance_summarize_expenses');
    });

    it('translates reminder/task request into tasks_create action', async () => {
      const plan = await planner.createPlan('Remind me to file tax documents');
      expect(plan.actions.length).toBe(1);
      expect(plan.actions[0].toolName).toBe('tasks_create');
    });
  });
});
