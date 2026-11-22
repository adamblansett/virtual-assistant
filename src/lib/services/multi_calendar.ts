/**
 * Multi-Calendar Federation Service.
 *
 * Coordinates scheduling across multiple personal, family, and secondary professional calendars:
 * 1. Discovers external personal calendar commitments.
 * 2. Mirrors privacy-masked busy blocks ("Busy (Personal Commitment)") onto the primary work calendar.
 * 3. Prevents corporate double-booking over personal doctors appointments, school events, or flights
 *    without exposing private titles or attendee lists to colleagues.
 */

import { AppStorage } from '@/lib/storage/db';
import { FederatedBusyBlock } from '@/types';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { OutboundWebhookBus } from './webhook_bus';

export interface ExternalCalendarEvent {
  id: string;
  summary: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export class MultiCalendarFederationService {
  /**
   * Mock external secondary calendar provider for offline/local simulation.
   */
  private static mockExternalEvents: Record<string, ExternalCalendarEvent[]> = {
    'fed_cal_personal': [
      {
        id: 'ext_pers_01',
        summary: 'Annual Health Checkup & Lab Work',
        startTime: new Date(Date.now() + 86400000 + 4 * 3600000).toISOString(), // Tomorrow 1:00 PM
        endTime: new Date(Date.now() + 86400000 + 5 * 3600000).toISOString(),   // Tomorrow 2:00 PM
        location: 'Mass General Brigham Medical Center'
      },
      {
        id: 'ext_pers_02',
        summary: 'Family School Conference',
        startTime: new Date(Date.now() + 2 * 86400000 + 6 * 3600000).toISOString(),
        endTime: new Date(Date.now() + 2 * 86400000 + 7 * 3600000).toISOString()
      }
    ]
  };

  /**
   * Sets or overrides mock external events for testing.
   */
  public static setMockExternalEvents(calendarId: string, events: ExternalCalendarEvent[]): void {
    this.mockExternalEvents[calendarId] = events;
  }

  /**
   * Synchronizes all active federated secondary calendars onto the primary calendar.
   */
  public static async syncBusyBlocks(): Promise<{
    calendarsProcessed: number;
    blocksCreated: number;
    existingBlocksCount: number;
    blocks: FederatedBusyBlock[];
  }> {
    AppStorage.initialize();
    const calendars = AppStorage.listFederatedCalendars().filter(c => c.enabled);
    const existingBlocks = AppStorage.listFederatedBusyBlocks();
    const existingBlockMap = new Map(existingBlocks.map(b => [`${b.calendarId}_${b.startTime}`, b]));

    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const createdBlocks: FederatedBusyBlock[] = [];

    for (const cal of calendars) {
      const externalEvents = this.mockExternalEvents[cal.id] || [];

      for (const evt of externalEvents) {
        const key = `${cal.id}_${evt.startTime}`;
        if (existingBlockMap.has(key)) {
          continue;
        }

        const maskedTitle = cal.maskTitles
          ? (cal.maskedPlaceholderTitle || 'Busy (Personal Commitment)')
          : evt.summary;

        // Create placeholder on primary corporate calendar
        const primaryEvent = await adapters.calendar.createEvent({
          summary: maskedTitle,
          startTime: evt.startTime,
          endTime: evt.endTime,
          description: 'Private placeholder synchronized via Virtual Assistant Multi-Calendar Federation.'
        });

        const block: FederatedBusyBlock = {
          id: `fblk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          calendarId: cal.id,
          primaryEventId: primaryEvent.id,
          startTime: evt.startTime,
          endTime: evt.endTime,
          title: maskedTitle,
          syncedAt: new Date().toISOString()
        };

        AppStorage.saveFederatedBusyBlock(block);
        createdBlocks.push(block);
        existingBlockMap.set(key, block);
      }

      cal.lastSyncedAt = new Date().toISOString();
      AppStorage.saveFederatedCalendar(cal);
    }

    if (createdBlocks.length > 0) {
      await OutboundWebhookBus.emitEvent('calendar.federated_synced', {
        createdBlocksCount: createdBlocks.length,
        calendarsCount: calendars.length
      });
    }

    return {
      calendarsProcessed: calendars.length,
      blocksCreated: createdBlocks.length,
      existingBlocksCount: existingBlocks.length,
      blocks: AppStorage.listFederatedBusyBlocks()
    };
  }

  /**
   * Cleans up all synchronized federated busy blocks from the primary calendar.
   */
  public static async clearFederatedBlocks(): Promise<{ clearedCount: number }> {
    AppStorage.initialize();
    const blocks = AppStorage.listFederatedBusyBlocks();
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    let cleared = 0;

    for (const b of blocks) {
      try {
        await adapters.calendar.cancelEvent(b.primaryEventId);
        AppStorage.deleteFederatedBusyBlock(b.id);
        cleared++;
      } catch {
        // Continue even if already cancelled
        AppStorage.deleteFederatedBusyBlock(b.id);
        cleared++;
      }
    }

    return { clearedCount: cleared };
  }
}
