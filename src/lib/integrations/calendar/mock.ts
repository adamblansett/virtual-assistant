/**
 * Deterministic Mock Google Calendar Adapter.
 * Simulates calendar scheduling, conflict detection, and event management.
 */

import { IIntegrationAdapter, IntegrationMetadata } from '../base';
import { CalendarEvent, ListEventsArgs, CreateEventArgs, RescheduleEventArgs } from './types';

export class MockCalendarAdapter implements IIntegrationAdapter {
  private events: Map<string, CalendarEvent> = new Map();
  private connected: boolean = true;
  private userEmail: string = 'user.demo@example.com';

  constructor() {
    this.seedMockData();
  }

  public seedMockData(): void {
    this.events.clear();

    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0, 0);
    const tomorrowEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 11, 0, 0);

    const dayAfter = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 0, 0);
    const dayAfterEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 15, 0, 0);

    const initialEvents: CalendarEvent[] = [
      {
        id: 'cal_event_001',
        summary: 'Team Sprint Planning',
        description: 'Review product backlog and assign weekly sprint stories.',
        startTime: tomorrow.toISOString(),
        endTime: tomorrowEnd.toISOString(),
        timeZone: 'America/New_York',
        attendees: ['team@workplace.org', this.userEmail],
        status: 'confirmed',
        location: 'Virtual / Google Meet'
      },
      {
        id: 'cal_event_002',
        summary: 'Quarterly Financial Review',
        description: 'Budget alignment and Q3 report walkthrough with CFO.',
        startTime: dayAfter.toISOString(),
        endTime: dayAfterEnd.toISOString(),
        timeZone: 'America/New_York',
        attendees: ['cfo@company.com', this.userEmail],
        status: 'confirmed',
        location: 'Executive Boardroom'
      }
    ];

    for (const evt of initialEvents) {
      this.events.set(evt.id, evt);
    }
  }

  public async metadata(): Promise<IntegrationMetadata> {
    return {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'Event scheduling and calendar management (Mock Mode Active)',
      connected: this.connected,
      userEmail: this.userEmail,
      scopesGranted: ['https://www.googleapis.com/auth/calendar.events'],
      lastSyncedAt: new Date().toISOString(),
      isMock: true
    };
  }

  public async isConnected(): Promise<boolean> {
    return this.connected;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public async listEvents(args: ListEventsArgs): Promise<CalendarEvent[]> {
    if (!this.connected) throw new Error('Calendar integration is not connected.');

    let results = Array.from(this.events.values()).filter(e => e.status !== 'cancelled');

    if (args.timeMin) {
      const minTime = new Date(args.timeMin).getTime();
      results = results.filter(e => new Date(e.endTime).getTime() >= minTime);
    }

    if (args.timeMax) {
      const maxTime = new Date(args.timeMax).getTime();
      results = results.filter(e => new Date(e.startTime).getTime() <= maxTime);
    }

    if (args.query) {
      const q = args.query.toLowerCase();
      results = results.filter(e => 
        e.summary.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q))
      );
    }

    return results.slice(0, args.maxResults || 50);
  }

  public async getEventDetails(eventId: string): Promise<CalendarEvent | null> {
    return this.events.get(eventId) || null;
  }

  public async createEvent(args: CreateEventArgs): Promise<CalendarEvent> {
    if (!this.connected) throw new Error('Calendar integration is not connected.');

    const id = `cal_event_${Date.now()}`;
    const newEvent: CalendarEvent = {
      id,
      summary: args.summary,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      timeZone: args.timeZone || 'America/New_York',
      attendees: args.attendees || [],
      status: 'confirmed',
      location: args.location
    };

    this.events.set(id, newEvent);
    return newEvent;
  }

  public async rescheduleEvent(args: RescheduleEventArgs): Promise<CalendarEvent> {
    if (!this.connected) throw new Error('Calendar integration is not connected.');

    const evt = this.events.get(args.eventId);
    if (!evt) throw new Error(`Calendar event ${args.eventId} not found.`);

    evt.startTime = args.newStartTime;
    evt.endTime = args.newEndTime;
    this.events.set(args.eventId, evt);
    return evt;
  }

  public async cancelEvent(eventId: string): Promise<{ success: boolean; eventId: string }> {
    if (!this.connected) throw new Error('Calendar integration is not connected.');

    const evt = this.events.get(eventId);
    if (!evt) throw new Error(`Calendar event ${eventId} not found.`);

    evt.status = 'cancelled';
    this.events.set(eventId, evt);
    return { success: true, eventId };
  }
}
