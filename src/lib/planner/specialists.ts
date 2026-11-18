/**
 * Multi-Agent Specialist Coordinator Service.
 *
 * Decomposes compound, multi-domain executive requests across specialized domain sub-agents:
 * 1. CommsSpecialist (Gmail, Ghostwriter, Inbox Triage)
 * 2. CalendarTravelSpecialist (Calendar, Smart Scheduling, Flight Tracking, Meeting Dossiers, Trips)
 * 3. FinanceLegalSpecialist (Expenses, Receipt OCR, Cloud Drive Contracts & Docs)
 * 4. ResearchMemorySpecialist (Web Search, URL Reader, Persistent Memory, Tasks, VIP Contacts)
 *
 * Synthesizes sub-agent outputs into a single dependency-ordered `TaskPlan`.
 */

import { TaskPlan, PlannedAction, UserPreferences } from '@/types';
import { IAIProviderAdapter } from '@/lib/ai/types';
import { TaskPlanner } from './planner';

export type SpecialistDomain =
  | 'comms_specialist'
  | 'calendar_travel_specialist'
  | 'finance_legal_specialist'
  | 'research_memory_specialist';

export interface SpecialistSubTask {
  clause: string;
  specialist: SpecialistDomain;
  actions: PlannedAction[];
  summary: string;
}

export class SpecialistCoordinatorService {
  private static readonly COMPOUND_DELIMITER =
    /\s+(?:and\s+then|after\s+that|followed\s+by|then\s+also)\s+|;\s+/i;

  /**
   * Determines whether a prompt is a compound multi-clause instruction requiring specialist decomposition.
   */
  public static isCompoundInstruction(prompt: string): boolean {
    if (!this.COMPOUND_DELIMITER.test(prompt)) return false;
    const clauses = this.splitIntoClauses(prompt);
    return clauses.length >= 2;
  }

  public static splitIntoClauses(prompt: string): string[] {
    return prompt
      .split(this.COMPOUND_DELIMITER)
      .map(c => c.trim())
      .filter(c => c.length >= 4);
  }

  /**
   * Routes a single clause to the most appropriate domain specialist sub-agent.
   */
  public static classifySpecialist(clause: string): SpecialistDomain {
    const lower = clause.toLowerCase();
    if (
      /\b(email|gmail|inbox|triage|ghostwrite|draft\s+reply|send\s+message)\b/.test(lower)
    ) {
      return 'comms_specialist';
    }
    if (
      /\b(calendar|schedule|meeting|slot|flight|trip|itinerary|hotel|dossier)\b/.test(lower)
    ) {
      return 'calendar_travel_specialist';
    }
    if (
      /\b(expense|receipt|invoice|spend|budget|contract|nda|document|drive|soc-2)\b/.test(lower)
    ) {
      return 'finance_legal_specialist';
    }
    return 'research_memory_specialist';
  }

  /**
   * Decomposes a compound request across specialist sub-agents and merges their actions into a unified TaskPlan.
   */
  public static async createMultiAgentPlan(
    prompt: string,
    aiProvider: IAIProviderAdapter,
    preferences: UserPreferences
  ): Promise<{
    plan: TaskPlan;
    subTasks: SpecialistSubTask[];
  }> {
    const clauses = this.splitIntoClauses(prompt);
    const subPlanner = new TaskPlanner(aiProvider, preferences);
    const subTasks: SpecialistSubTask[] = [];
    const mergedActions: PlannedAction[] = [];

    for (let idx = 0; idx < clauses.length; idx++) {
      const clause = clauses[idx];
      const specialist = this.classifySpecialist(clause);
      const subPlan = await subPlanner.createPlan(clause, false);

      for (const act of subPlan.actions) {
        mergedActions.push({
          ...act,
          id: `act_spec_${idx + 1}_${act.id}`,
          expectedOutcome: `[${specialist}] ${act.expectedOutcome}`
        });
      }

      subTasks.push({
        clause,
        specialist,
        actions: subPlan.actions,
        summary: subPlan.summary
      });
    }

    const requiresConfirmation = mergedActions.some(a => a.approvalRequired);
    const planId = `plan_multi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const specialistNames = Array.from(new Set(subTasks.map(s => s.specialist))).join(', ');

    const unifiedPlan: TaskPlan = {
      id: planId,
      userRequestId: `req_multi_${Date.now()}`,
      originalPrompt: prompt,
      summary: `Multi-Agent Specialist Plan (${specialistNames}): ${subTasks.map(s => s.summary).join(' -> ')}`,
      status: requiresConfirmation ? 'awaiting_approval' : 'proposed',
      actions: mergedActions,
      requiresUserConfirmation: requiresConfirmation,
      confirmationPrompt: requiresConfirmation
        ? 'One or more specialist sub-agent actions require explicit human confirmation before execution.'
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      plan: unifiedPlan,
      subTasks
    };
  }
}
