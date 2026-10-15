import { describe, it, expect, beforeEach } from 'vitest';
import { MeetingPrepService } from '@/lib/services/meeting_prep';
import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { ToolRegistry } from '@/lib/tools/registry';

describe('Meeting Intelligence & Executive Dossier Service', () => {
  beforeEach(() => {
    AppStorage.reset();
    WorkflowExecutionEngine.reset();
  });

  it('compiles a comprehensive meeting dossier with attendee intelligence and talking points', async () => {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const events = await adapters.calendar.listEvents({});
    expect(events.length).toBeGreaterThan(0);

    const firstMeeting = events[0];
    const dossier = await MeetingPrepService.prepareMeetingDossier(firstMeeting.id);

    expect(dossier).toBeDefined();
    expect(dossier.meetingId).toBe(firstMeeting.id);
    expect(dossier.title).toBe(firstMeeting.summary);
    expect(dossier.attendees.length).toBeGreaterThanOrEqual(1);
    expect(dossier.talkingPoints.length).toBeGreaterThanOrEqual(1);
    expect(dossier.executivePrepSummary).toContain(firstMeeting.summary);

    // Verify stored in AppStorage
    const stored = AppStorage.getMeetingDossier(firstMeeting.id);
    expect(stored).toBeDefined();
    expect(stored?.title).toBe(firstMeeting.summary);
  });

  it('matches VIP attendees against contacts and extracts relationship notes and email threads', async () => {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const events = await adapters.calendar.listEvents({});
    const clientDinner = events.find(e => e.summary.includes('Client')) || events[0];

    const dossier = await MeetingPrepService.prepareMeetingDossier(clientDinner.id);

    const vipAttendee = dossier.attendees.find(a => a.isVIP);
    if (vipAttendee) {
      expect(vipAttendee.isVIP).toBe(true);
      expect(vipAttendee.company).toBeDefined();
      expect(vipAttendee.contextNotes.length).toBeGreaterThan(0);
    }
  });

  it('processes raw meeting notes, extracts action items as tasks, and prepares follow-up recap draft', async () => {
    const rawNotes = `
      Executive Strategy Sync Discussion:
      - Action: Finalize Enterprise SOW by Friday
      - Todo: Align quarterly headcount with VP Engineering
      - Follow up: Confirm keynote speaker travel bookings
      General banter about coffee machines
    `;

    const result = await MeetingPrepService.processMeetingNotes(
      'Strategy Sync',
      rawNotes,
      ['sarah.chen@partnercorp.com']
    );

    expect(result.extractedTasks.length).toBe(3);
    expect(result.extractedTasks[0].title).toContain('Finalize Enterprise SOW');
    expect(result.extractedTasks[1].title).toContain('Align quarterly headcount');
    expect(result.extractedTasks[2].title).toContain('Confirm keynote speaker');

    // Verify tasks are persisted in AppStorage
    const allTasks = AppStorage.listTasks();
    expect(allTasks.some(t => t.title.includes('Finalize Enterprise SOW'))).toBe(true);

    // Verify follow-up email draft
    expect(result.followUpDraft.recipients).toEqual(['sarah.chen@partnercorp.com']);
    expect(result.followUpDraft.subject).toContain('Meeting Recap & Next Steps: Strategy Sync');
    expect(result.followUpDraft.body).toContain('Finalize Enterprise SOW');
  });

  it('executes meeting tools via ToolRegistry', async () => {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const events = await adapters.calendar.listEvents({});

    // 1. Tool meeting_prepare_dossier
    const dossierResult = await ToolRegistry.executeTool(
      'meeting_prepare_dossier',
      { meetingId: events[0].id },
      adapters
    );
    expect(dossierResult.meetingId).toBe(events[0].id);

    // 2. Tool meeting_process_notes
    const notesResult = await ToolRegistry.executeTool(
      'meeting_process_notes',
      {
        meetingTitle: 'Product Architecture Review',
        rawNotes: '- Action: Submit security assessment for review',
        attendees: ['alice@example.com']
      },
      adapters
    );
    expect(notesResult.extractedTasks.length).toBe(1);
    expect(notesResult.extractedTasks[0].title).toBe('Submit security assessment for review');
  });
});
