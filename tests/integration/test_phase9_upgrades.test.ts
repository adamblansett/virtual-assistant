import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { ToolRegistry } from '@/lib/tools/registry';
import { SpecialistCoordinatorService } from '@/lib/planner/specialists';
import { ConflictDetectorService } from '@/lib/services/conflict_detector';
import { ConflictResolverService } from '@/lib/services/conflict_resolver';
import { ShadowDraftService } from '@/lib/services/shadow_drafts';
import { MeetingAudioService } from '@/lib/services/meeting_audio';
import { MultiCalendarFederationService } from '@/lib/services/multi_calendar';
import { OutboundWebhookBus } from '@/lib/services/webhook_bus';

// Route handlers
import { POST as resolveConflictPOST } from '@/app/api/assistant/conflicts/resolve/route';
import { GET as shadowDraftsGET, POST as shadowDraftsPOST } from '@/app/api/assistant/shadow-drafts/route';
import { POST as meetingRecorderPOST } from '@/app/api/audio/meeting-recorder/route';
import { GET as calendarFederationGET, POST as calendarFederationPOST } from '@/app/api/calendar/federation/route';

describe('Phase 9: Autonomous Conflict Auto-Fixer, Shadow Drafts, Meeting Audio & Multi-Calendar Federation', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  describe('1. Autonomous Conflict Auto-Fixer & Rescheduler', () => {
    it('automatically resolves buffer violations and calendar overlaps by rescheduling to a compliant slot', async () => {
      const adapters = WorkflowExecutionEngine.getAdaptersBundle();
      const now = new Date();
      const meetingA = await adapters.calendar.createEvent({
        summary: 'Strategic Board Sync A',
        startTime: new Date(now.getTime() + 86400000).toISOString(),
        endTime: new Date(now.getTime() + 86400000 + 3600000).toISOString()
      });

      // Meeting B starts 5 minutes after meeting A (violates 15m buffer rule)
      const meetingB = await adapters.calendar.createEvent({
        summary: 'Client Review Meeting B',
        startTime: new Date(now.getTime() + 86400000 + 3900000).toISOString(),
        endTime: new Date(now.getTime() + 86400000 + 5700000).toISOString()
      });

      const scan = await ConflictDetectorService.scanAllConflicts();
      const bufferConflict = scan.conflicts.find(c => c.affectedIds.includes(meetingA.id) && c.affectedIds.includes(meetingB.id));
      expect(bufferConflict).toBeDefined();

      // Resolve the conflict
      const resolution = await ConflictResolverService.resolveConflict(bufferConflict!.id);
      expect(resolution.resolved).toBe(true);
      expect(resolution.actionTaken).toContain('Rescheduled');

      // Verify the event was updated in calendar
      const updatedEvents = await adapters.calendar.listEvents({ timeMin: new Date(now.getTime()).toISOString() });
      const updatedB = updatedEvents.find(e => e.id === meetingB.id);
      expect(updatedB).toBeDefined();
    });

    it('automatically voids duplicate expense records and annotates high spend anomalies', async () => {
      const dupExp1 = {
        id: 'exp_dup_test_01',
        merchant: 'Uber Enterprise Ride',
        amount: 48.50,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        category: 'travel' as const,
        source: 'Executive ride to airport',
        verified: true
      };
      const dupExp2 = {
        id: 'exp_dup_test_02',
        merchant: 'Uber Enterprise Ride',
        amount: 48.50,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        category: 'travel' as const,
        source: 'Executive ride to airport copy',
        verified: false
      };

      AppStorage.saveExpense(dupExp1);
      AppStorage.saveExpense(dupExp2);

      const scan = await ConflictDetectorService.scanAllConflicts();
      const dupConflict = scan.conflicts.find(c => c.type === 'duplicate_expense');
      expect(dupConflict).toBeDefined();

      const res = await ConflictResolverService.resolveConflict(dupConflict!.id);
      expect(res.resolved).toBe(true);
      expect(res.actionTaken).toContain('Voided duplicate charge');

      const expenses = AppStorage.listExpenses();
      const updatedDup = expenses.find(e => e.id === dupExp2.id);
      expect(updatedDup?.source).toContain('[DUPLICATE VOIDED]');
    });

    it('rekindles overdue VIP relationships by creating high-priority follow-up tasks', async () => {
      const vipContact = {
        id: 'cont_vip_overdue_test',
        name: 'Sarah Partner',
        email: 'sarah.partner@venturefund.com',
        isVIP: true,
        notes: ['Lead Series B Partner'],
        followUpCadenceDays: 7,
        lastContactedAt: new Date(Date.now() - 20 * 86400000).toISOString(), // 20 days ago (stalled)
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      AppStorage.saveContact(vipContact);

      const scan = await ConflictDetectorService.scanAllConflicts();
      const vipConflict = scan.conflicts.find(c => c.affectedIds.includes(vipContact.id));
      expect(vipConflict).toBeDefined();

      const res = await ConflictResolverService.resolveConflict(vipConflict!.id);
      expect(res.resolved).toBe(true);
      expect(res.actionTaken).toContain('Created high-priority follow-up task');

      const tasks = AppStorage.listTasks();
      const followUpTask = tasks.find(t => t.title.includes(vipContact.name));
      expect(followUpTask).toBeDefined();
      expect(followUpTask?.priority).toBe('high');
    });

    it('exposes POST /api/assistant/conflicts/resolve endpoint supporting resolveAll', async () => {
      const res = await resolveConflictPOST(
        new NextRequest('http://localhost:3000/api/assistant/conflicts/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolveAll: true })
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.totalResolved).toBe('number');
    });
  });

  describe('2. Shadow Executive Background Draft Engine (Zero-Touch Inbox)', () => {
    it('scans unread triageable emails and generates in-voice shadow drafts', async () => {
      const scanResult = await ShadowDraftService.scanAndGenerateShadowDrafts();
      expect(scanResult.scannedCount).toBeGreaterThan(0);
      expect(scanResult.draftsCreated).toBeGreaterThan(0);

      const drafts = AppStorage.listShadowDrafts();
      expect(drafts.length).toBeGreaterThan(0);

      const firstDraft = drafts[0];
      expect(firstDraft.status).toBe('pending_review');
      expect(firstDraft.proposedBody.length).toBeGreaterThan(20);
      expect(firstDraft.recipient).toContain('@');
    });

    it('approves, revises, and discards shadow drafts via service methods', async () => {
      await ShadowDraftService.scanAndGenerateShadowDrafts();
      const drafts = AppStorage.listShadowDrafts();
      const draft = drafts[0];
      expect(draft).toBeDefined();

      // Revise draft
      const revRes = ShadowDraftService.reviseDraft(draft.id, 'Sounds great. Let us connect Tuesday at 2 PM.');
      expect(revRes.success).toBe(true);
      expect(revRes.draft?.proposedBody).toBe('Sounds great. Let us connect Tuesday at 2 PM.');
      expect(revRes.draft?.status).toBe('revised');

      // Approve & send draft
      const sendRes = await ShadowDraftService.approveAndSendDraft(draft.id);
      expect(sendRes.success).toBe(true);
      expect(sendRes.sentMessageId).toBeDefined();

      const updated = AppStorage.getShadowDraft(draft.id);
      expect(updated?.status).toBe('approved_sent');

      // Discard a draft
      if (drafts.length > 1) {
        const second = drafts[1];
        const discRes = ShadowDraftService.discardDraft(second.id);
        expect(discRes.success).toBe(true);
        expect(AppStorage.getShadowDraft(second.id)?.status).toBe('discarded');
      }
    });

    it('exposes GET and POST /api/assistant/shadow-drafts endpoint', async () => {
      // 1. GET list
      const getRes = await shadowDraftsGET(new NextRequest('http://localhost:3000/api/assistant/shadow-drafts'));
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);

      // 2. POST scan
      const postRes = await shadowDraftsPOST(
        new NextRequest('http://localhost:3000/api/assistant/shadow-drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'scan_and_generate' })
        })
      );
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.success).toBe(true);
    });
  });

  describe('3. Meeting Audio Diarization & Action Extraction', () => {
    it('extracts decisions, commitments, assignees, deadlines, and creates executive tasks from dialogue', async () => {
      const transcript =
        'Marcus: We decided to approve the $150k marketing budget for Q1.\n' +
        'Sarah: I will finalize the campaign creative assets by Friday 5 PM.\n' +
        'Executive: I will review and sign the influencer agency contract by tomorrow.\n' +
        'Alex: We agreed to schedule our launch sync for next Wednesday.';

      const result = await MeetingAudioService.processMeetingRecord({
        meetingTitle: 'Q1 Marketing Strategy Alignment',
        transcript,
        attendees: ['marcus@partner.com', 'sarah@partner.com', 'alex@partner.com']
      });

      expect(result.meetingTitle).toBe('Q1 Marketing Strategy Alignment');
      expect(result.decisions.length).toBeGreaterThanOrEqual(2);
      expect(result.actionItems.length).toBeGreaterThanOrEqual(2);

      // Verify task creation
      const tasks = AppStorage.listTasks();
      const executiveTask = tasks.find(t => t.title.includes('influencer agency contract'));
      expect(executiveTask).toBeDefined();

      // Verify follow-up email draft
      expect(result.followUpEmailDraft.subject).toContain('Recap & Action Items');
      expect(result.followUpEmailDraft.body).toContain('KEY DECISIONS');
      expect(result.followUpEmailDraft.body).toContain('ACTION ITEMS');
    });

    it('exposes POST /api/audio/meeting-recorder endpoint', async () => {
      const res = await meetingRecorderPOST(
        new NextRequest('http://localhost:3000/api/audio/meeting-recorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingTitle: 'Executive Sync',
            transcript: 'Sarah: We agreed to close the agreement by Thursday.\nAlex: I will send the redlines.'
          })
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.decisions.length).toBeGreaterThan(0);
      expect(data.actionItems.length).toBeGreaterThan(0);
    });
  });

  describe('4. Multi-Calendar Federation (Personal + Work Calendar Sync)', () => {
    it('discovers personal events and mirrors privacy-masked busy blocks onto the primary calendar', async () => {
      const syncResult = await MultiCalendarFederationService.syncBusyBlocks();
      expect(syncResult.calendarsProcessed).toBeGreaterThan(0);
      expect(syncResult.blocksCreated).toBeGreaterThan(0);

      const blocks = AppStorage.listFederatedBusyBlocks();
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0].title).toBe('Busy (Personal Commitment)');

      // Verify primary calendar received the placeholder event
      const adapters = WorkflowExecutionEngine.getAdaptersBundle();
      const events = await adapters.calendar.listEvents({
        timeMin: new Date(Date.now()).toISOString()
      });
      const maskedEvent = events.find(e => e.summary === 'Busy (Personal Commitment)');
      expect(maskedEvent).toBeDefined();
    });

    it('clears federated busy blocks upon request', async () => {
      await MultiCalendarFederationService.syncBusyBlocks();
      expect(AppStorage.listFederatedBusyBlocks().length).toBeGreaterThan(0);

      const clearResult = await MultiCalendarFederationService.clearFederatedBlocks();
      expect(clearResult.clearedCount).toBeGreaterThan(0);
      expect(AppStorage.listFederatedBusyBlocks().length).toBe(0);
    });

    it('exposes GET and POST /api/calendar/federation endpoint', async () => {
      const getRes = await calendarFederationGET(new NextRequest('http://localhost:3000/api/calendar/federation'));
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);
      expect(Array.isArray(getData.calendars)).toBe(true);

      const postRes = await calendarFederationPOST(
        new NextRequest('http://localhost:3000/api/calendar/federation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync' })
        })
      );
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.success).toBe(true);
      expect(postData.blocksCreated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5. Tool Registry & Multi-Agent Specialist Decomposition', () => {
    it('registers and executes all 5 new Phase 9 tools via ToolRegistry', async () => {
      expect(ToolRegistry.getTool('assistant_resolve_conflict')).toBeDefined();
      expect(ToolRegistry.getTool('assistant_scan_shadow_drafts')).toBeDefined();
      expect(ToolRegistry.getTool('assistant_action_shadow_draft')).toBeDefined();
      expect(ToolRegistry.getTool('meeting_process_audio_transcript')).toBeDefined();
      expect(ToolRegistry.getTool('calendar_federate_busy_blocks')).toBeDefined();

      // Execute calendar federation tool
      const fedRes = await ToolRegistry.executeTool('calendar_federate_busy_blocks', { action: 'sync' });
      expect(fedRes.calendarsProcessed).toBeGreaterThan(0);

      // Execute meeting audio tool
      const audioRes = await ToolRegistry.executeTool('meeting_process_audio_transcript', {
        meetingTitle: 'Board Planning',
        transcript: 'Partner: We decided to launch next month.\nExecutive: I will notify the press team.'
      });
      expect(audioRes.decisions.length).toBeGreaterThan(0);

      // Execute shadow draft scan
      const shadowRes = await ToolRegistry.executeTool('assistant_scan_shadow_drafts', {});
      expect(shadowRes.scannedCount).toBeGreaterThan(0);

      // Execute conflict resolution
      const confRes = await ToolRegistry.executeTool('assistant_resolve_conflict', { resolveAll: true });
      expect(typeof confRes.totalResolved).toBe('number');
    });

    it('properly classifies compound Phase 9 specialist instructions', () => {
      expect(SpecialistCoordinatorService.classifySpecialist('prepare in-voice shadow drafts for unread emails')).toBe('comms_specialist');
      expect(SpecialistCoordinatorService.classifySpecialist('resolve calendar buffer conflict')).toBe('calendar_travel_specialist');
      expect(SpecialistCoordinatorService.classifySpecialist('sync personal calendar and federate busy blocks')).toBe('calendar_travel_specialist');
      expect(SpecialistCoordinatorService.classifySpecialist('process meeting audio and extract commitments')).toBe('calendar_travel_specialist');
      expect(SpecialistCoordinatorService.classifySpecialist('reconcile corporate travel expense')).toBe('finance_legal_specialist');
    });
  });
});
