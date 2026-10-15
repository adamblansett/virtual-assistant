import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleCalendarService } from '@/lib/integrations/calendar/service';
import { ToolRegistry } from '@/lib/tools/registry';
import { ResultVerifier } from '@/lib/verification/verifier';
import { AppStorage } from '@/lib/storage/db';

describe('Google Calendar Service & Live Integration Suite', () => {
  let calendarService: GoogleCalendarService;

  beforeEach(() => {
    AppStorage.reset();
    calendarService = new GoogleCalendarService();
  });

  it('exposes accurate metadata and reports unauthenticated in default offline test mode', async () => {
    const meta = await calendarService.metadata();
    expect(meta.id).toBe('google_calendar');
    expect(meta.name).toBe('Google Calendar');
    expect(meta.connected).toBe(false);
    expect(meta.isMock).toBe(false);

    const isConn = await calendarService.isConnected();
    expect(isConn).toBe(false);
  });

  it('creates an event in fallback store when unauthenticated and retrieves details', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 3600000).toISOString();
    const endTime = new Date(now.getTime() + 7200000).toISOString();

    const created = await calendarService.createEvent({
      summary: 'Q4 Budget Alignment Meeting',
      description: 'Discuss financial forecasts and headcount plans',
      startTime,
      endTime,
      attendees: ['cfo@example.com', 'vp_eng@example.com'],
      location: 'Conference Room 3B'
    });

    expect(created.id).toBeDefined();
    expect(created.summary).toBe('Q4 Budget Alignment Meeting');
    expect(created.status).toBe('confirmed');
    expect(created.attendees).toContain('cfo@example.com');

    // Retrieve event details
    const retrieved = await calendarService.getEventDetails(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.summary).toBe('Q4 Budget Alignment Meeting');
    expect(retrieved?.location).toBe('Conference Room 3B');
  });

  it('lists events with time boundary filters in offline store', async () => {
    const baseTime = new Date('2026-10-20T10:00:00Z').getTime();

    // Event 1: Oct 20 10:00 - 11:00
    await calendarService.createEvent({
      summary: 'Meeting 1',
      startTime: new Date(baseTime).toISOString(),
      endTime: new Date(baseTime + 3600000).toISOString()
    });

    // Event 2: Oct 21 14:00 - 15:00
    await calendarService.createEvent({
      summary: 'Meeting 2',
      startTime: new Date(baseTime + 86400000).toISOString(),
      endTime: new Date(baseTime + 86400000 + 3600000).toISOString()
    });

    const allEvents = await calendarService.listEvents({});
    expect(allEvents.length).toBe(2);

    // Filter only Oct 20
    const filtered = await calendarService.listEvents({
      timeMin: '2026-10-20T00:00:00Z',
      timeMax: '2026-10-20T23:59:59Z'
    });
    expect(filtered.length).toBe(1);
    expect(filtered[0].summary).toBe('Meeting 1');
  });

  it('reschedules an existing event to a new start and end time', async () => {
    const created = await calendarService.createEvent({
      summary: 'Product Roadmap Sync',
      startTime: '2026-10-22T14:00:00Z',
      endTime: '2026-10-22T15:00:00Z'
    });

    const rescheduled = await calendarService.rescheduleEvent({
      eventId: created.id,
      newStartTime: '2026-10-22T16:00:00Z',
      newEndTime: '2026-10-22T17:00:00Z'
    });

    expect(rescheduled.startTime).toBe('2026-10-22T16:00:00Z');
    expect(rescheduled.endTime).toBe('2026-10-22T17:00:00Z');

    const details = await calendarService.getEventDetails(created.id);
    expect(details?.startTime).toBe('2026-10-22T16:00:00Z');
  });

  it('cancels an event and excludes it from active event listings', async () => {
    const created = await calendarService.createEvent({
      summary: 'Canceled 1:1 Check-in',
      startTime: '2026-10-23T11:00:00Z',
      endTime: '2026-10-23T11:30:00Z'
    });

    const cancelRes = await calendarService.cancelEvent(created.id);
    expect(cancelRes.success).toBe(true);

    const details = await calendarService.getEventDetails(created.id);
    expect(details?.status).toBe('cancelled');

    const activeList = await calendarService.listEvents({});
    expect(activeList.some(e => e.id === created.id)).toBe(false);
  });

  it('integrates seamlessly with ToolRegistry and ResultVerifier', async () => {
    const adapters = {
      calendar: calendarService
    };

    // 1. Tool execution via ToolRegistry
    const toolResult = await ToolRegistry.executeTool(
      'calendar_create_event',
      {
        summary: 'Verified Board Meeting',
        startTime: '2026-11-01T15:00:00Z',
        endTime: '2026-11-01T16:30:00Z'
      },
      adapters
    );

    expect(toolResult.id).toBeDefined();

    // 2. Authoritative verification via ResultVerifier
    const verification = await ResultVerifier.verifyAction(
      {
        id: 'act_cal_01',
        integration: 'google_calendar',
        toolName: 'calendar_create_event',
        arguments: {
          summary: 'Verified Board Meeting',
          startTime: '2026-11-01T15:00:00Z',
          endTime: '2026-11-01T16:30:00Z'
        },
        result: toolResult,
        status: 'succeeded',
        riskLevel: 'consequential',
        requiredPermission: 'calendar.events',
        targetResource: 'primary_calendar',
        expectedOutcome: 'Create confirmed calendar event',
        approvalRequired: true,
        verificationStatus: 'pending',
        retryCount: 0
      },
      adapters
    );

    expect(verification.verified).toBe(true);
    expect(verification.verifiedCount).toBe(1);
    expect(verification.failedCount).toBe(0);
    expect(verification.details[0]).toContain(`Verified event ${toolResult.id} on calendar.`);
  });
});
