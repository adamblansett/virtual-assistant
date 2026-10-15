import { describe, it, expect, beforeEach } from 'vitest';
import { SchedulingCoordinatorService } from '@/lib/services/scheduling_coordinator';
import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';

describe('Multi-Turn Email Scheduling Coordinator Service', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('evaluates inbound meeting inquiry and proposes multiple buffer-conscious free slots', async () => {
    const proposal = await SchedulingCoordinatorService.coordinateMeeting({
      sender: 'alex.rivera@venturecorp.com',
      meetingTopic: 'Series B Strategic Discussion',
      rawInquiry: 'Hi, would love to connect this week to discuss our investment thesis. What times work for you?',
      durationMinutes: 30
    });

    expect(proposal.inquirySender).toBe('alex.rivera@venturecorp.com');
    expect(proposal.meetingTopic).toBe('Series B Strategic Discussion');
    expect(proposal.status).toBe('slots_proposed');
    expect(Array.isArray(proposal.proposedSlots)).toBe(true);
    expect(proposal.proposedSlots.length).toBeGreaterThan(0);
    expect(proposal.responseDraft).toBeDefined();
    expect(proposal.responseDraft.to).toBe('alex.rivera@venturecorp.com');
    expect(proposal.responseDraft.body).toContain('Series B Strategic Discussion');
  });

  it('automatically books calendar event and drafts confirmation when inbound email accepts a specific time', async () => {
    const targetDate = new Date(Date.now() + 86400000);
    targetDate.setHours(14, 0, 0, 0);

    const booking = await SchedulingCoordinatorService.coordinateMeeting({
      sender: 'alex.rivera@venturecorp.com',
      meetingTopic: 'Series B Strategic Discussion',
      rawInquiry: `Tuesday at 2:00 PM works perfectly for me. Let's confirm that time.`,
      durationMinutes: 45
    });

    expect(booking.status).toBe('meeting_booked');
    expect(booking.responseDraft.subject).toContain('Confirmed: Series B Strategic Discussion');
    expect(booking.responseDraft.body).toContain('Google Meet');

    // Verify calendar event was created in the calendar adapter
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const events = await adapters.calendar.listEvents({});
    const found = events.find(e => e.summary.includes('Series B Strategic Discussion'));
    expect(found).toBeDefined();
  });
});
