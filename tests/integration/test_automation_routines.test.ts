import { describe, it, expect, beforeEach } from 'vitest';
import { AssistantAutomationService } from '@/lib/services/automation';
import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { ToolRegistry } from '@/lib/tools/registry';
import { MockAIProvider } from '@/lib/ai/mock';

describe('Assistant Automation & Routine Service', () => {
  beforeEach(() => {
    AppStorage.reset();
    WorkflowExecutionEngine.reset();
  });

  it('runs morning_briefing routine and persists artifacts', async () => {
    const result = await AssistantAutomationService.runRoutine('morning_briefing');

    expect(result.status).toBe('succeeded');
    expect(result.routineType).toBe('morning_briefing');
    expect(result.summary).toContain('Morning Routine Completed');
    expect(result.generatedArtifacts?.briefing).toBeDefined();
    expect(result.generatedArtifacts?.triageSummary).toBeDefined();

    const history = AppStorage.listRoutineResults();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(result.id);
  });

  it('runs evening_wrapup routine and computes task rollover statistics', async () => {
    // Complete a task first
    const tasks = AppStorage.listTasks();
    if (tasks.length > 0) {
      tasks[0].status = 'completed';
      AppStorage.saveTask(tasks[0]);
    }

    const result = await AssistantAutomationService.runRoutine('evening_wrapup');

    expect(result.status).toBe('succeeded');
    expect(result.routineType).toBe('evening_wrapup');
    expect(result.summary).toContain('Evening Wrap-Up Completed');
    expect(result.generatedArtifacts?.completedCount).toBeGreaterThanOrEqual(1);
    expect(result.generatedArtifacts?.rolloverCount).toBeGreaterThanOrEqual(0);
  });

  it('runs weekly_audit routine and identifies overdue VIPs and total spending', async () => {
    const result = await AssistantAutomationService.runRoutine('weekly_audit');

    expect(result.status).toBe('succeeded');
    expect(result.routineType).toBe('weekly_audit');
    expect(result.summary).toContain('Weekly Executive Audit Completed');
    expect(result.generatedArtifacts?.totalExpenses).toBeGreaterThan(0);
    expect(Array.isArray(result.generatedArtifacts?.overdueVIPs)).toBe(true);
  });

  it('executes routine via ToolRegistry', async () => {
    const res = await ToolRegistry.executeTool(
      'assistant_run_routine',
      { routineType: 'morning_briefing' }
    );
    expect(res.status).toBe('succeeded');
    expect(res.routineType).toBe('morning_briefing');
  });

  it('correctly maps natural language queries to routines, dossiers, and travel in MockAIProvider', async () => {
    const ai = new MockAIProvider();

    // 1. Routine intent
    const eveningRes = await ai.generateCompletion([
      { role: 'user', content: 'Run my evening wrap-up routine' }
    ]);
    expect(eveningRes.toolCalls?.[0].name).toBe('assistant_run_routine');
    expect(eveningRes.toolCalls?.[0].arguments.routineType).toBe('evening_wrapup');

    // 2. Weekly audit intent
    const auditRes = await ai.generateCompletion([
      { role: 'user', content: 'Run the weekly executive audit' }
    ]);
    expect(auditRes.toolCalls?.[0].name).toBe('assistant_run_routine');
    expect(auditRes.toolCalls?.[0].arguments.routineType).toBe('weekly_audit');

    // 3. Meeting dossier intent
    const dossierRes = await ai.generateCompletion([
      { role: 'user', content: 'Prepare briefing dossier for my next meeting' }
    ]);
    expect(dossierRes.toolCalls?.[0].name).toBe('meeting_prepare_dossier');

    // 4. Meeting notes intent
    const notesRes = await ai.generateCompletion([
      { role: 'user', content: 'Process meeting notes:\n- Action: Send invoice' }
    ]);
    expect(notesRes.toolCalls?.[0].name).toBe('meeting_process_notes');

    // 5. Travel itinerary intent
    const travelRes = await ai.generateCompletion([
      { role: 'user', content: 'What is my travel itinerary for New York?' }
    ]);
    expect(travelRes.toolCalls?.[0].name).toBe('travel_list_trips');

    // 6. Travel reservation extraction intent
    const extractRes = await ai.generateCompletion([
      { role: 'user', content: 'Scan inbox for flight confirmations and hotel reservations' }
    ]);
    expect(extractRes.toolCalls?.[0].name).toBe('travel_extract_reservations');
  });
});
