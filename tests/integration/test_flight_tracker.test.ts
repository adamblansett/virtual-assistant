import { describe, it, expect, beforeEach } from 'vitest';
import { FlightTrackerService } from '@/lib/services/flight_tracker';
import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';

describe('Real-Time Flight Status Tracking & Gate Alert Service', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('tracks on-time commercial flights and reports scheduled gate and terminal details', async () => {
    const update = await FlightTrackerService.trackFlight('DL 1192');

    expect(update.flightNumber).toBe('DL 1192');
    expect(update.airline).toBe('Delta Air Lines');
    expect(update.status).toBe('on_time');
    expect(update.delayMinutes).toBe(0);
    expect(update.departureGate).toBeDefined();
    expect(update.arrivalGate).toBeDefined();
    expect(update.alertMessage).toContain('on schedule');
  });

  it('detects flight delays, calculates revised departure times, and broadcasts gate alerts', async () => {
    const update = await FlightTrackerService.trackFlight('DL 428');

    expect(update.flightNumber).toBe('DL 428');
    expect(update.status).toBe('delayed');
    expect(update.delayMinutes).toBe(45);
    expect(update.alertMessage).toContain('Delay Alert');
    expect(update.alertMessage).toContain('45 minutes');
    expect(new Date(update.estimatedDeparture).getTime()).toBeGreaterThan(new Date(update.scheduledDeparture).getTime());
  });

  it('reschedules executive calendar block when flight experiences a delay', async () => {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();

    // First create a flight event on the calendar
    const initialStart = new Date(Date.now() + 86400000);
    const initialEnd = new Date(Date.now() + 86400000 + 7200000);
    await adapters.calendar.createEvent({
      summary: 'Flight DL 428 to JFK',
      startTime: initialStart.toISOString(),
      endTime: initialEnd.toISOString(),
      timeZone: 'America/New_York',
      attendees: ['me@example.com']
    });

    // Run flight tracking
    await FlightTrackerService.trackFlight('DL 428');

    // Verify calendar event was rescheduled
    const events = await adapters.calendar.listEvents({});
    const updatedFlightEvent = events.find(e => e.summary.includes('DL 428'));
    expect(updatedFlightEvent).toBeDefined();
    expect(new Date(updatedFlightEvent!.startTime).getTime()).toBeGreaterThan(initialStart.getTime());
  });
});
