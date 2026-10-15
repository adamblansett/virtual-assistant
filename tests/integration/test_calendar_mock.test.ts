import { describe, it, expect, beforeEach } from 'vitest';
import { MockCalendarAdapter } from '@/lib/integrations/calendar/mock';
import { ResultVerifier } from '@/lib/verification/verifier';
import { PlannedAction } from '@/types';

describe('Google Calendar Integration & Verification', () => {
  let calendar: MockCalendarAdapter;

  beforeEach(() => {
    calendar = new MockCalendarAdapter();
  });

  it('lists seeded calendar events', async () => {
    const events = await calendar.listEvents({});
    expect(events.length).toBeGreaterThan(0);
    const titles = events.map(e => e.summary);
    expect(titles).toContain('Team Sprint Planning');
    expect(titles).toContain('Quarterly Financial Review');
  });

  it('creates a new event and authoritatively verifies it', async () => {
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 90000000).toISOString();

    const newEvt = await calendar.createEvent({
      summary: 'Product Architecture Review',
      description: 'Discuss modular integration design.',
      startTime: start,
      endTime: end,
      timeZone: 'America/New_York',
      attendees: ['alice@example.com']
    });

    expect(newEvt.id).toBeDefined();
    expect(newEvt.summary).toBe('Product Architecture Review');

    // Run authoritative verification
    const action: PlannedAction = {
      id: 'act_cal_1',
      integration: 'google_calendar',
      toolName: 'calendar_create_event',
      arguments: {},
      requiredPermission: 'calendar.events',
      targetResource: 'calendar:events',
      expectedOutcome: 'Create event',
      riskLevel: 'consequential',
      approvalRequired: true,
      status: 'succeeded',
      result: newEvt,
      verificationStatus: 'pending',
      retryCount: 0
    };

    const outcome = await ResultVerifier.verifyAction(action, { calendar });
    expect(outcome.verified).toBe(true);
    expect(outcome.verifiedCount).toBe(1);
  });

  it('reschedules an existing event', async () => {
    const newStart = new Date(Date.now() + 172800000).toISOString();
    const newEnd = new Date(Date.now() + 176400000).toISOString();

    const updated = await calendar.rescheduleEvent({
      eventId: 'cal_event_001',
      newStartTime: newStart,
      newEndTime: newEnd
    });

    expect(updated.startTime).toBe(newStart);
  });

  it('cancels an event and marks it cancelled', async () => {
    const res = await calendar.cancelEvent('cal_event_002');
    expect(res.success).toBe(true);

    const detail = await calendar.getEventDetails('cal_event_002');
    expect(detail?.status).toBe('cancelled');
  });
});
