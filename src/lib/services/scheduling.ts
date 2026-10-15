/**
 * Executive Scheduling & Calendar Coordination Service.
 * 
 * Replaces human assistant scheduling tasks:
 * - Computes mutual free time slots considering existing commitments and buffer times
 * - Coordinates meetings with contacts
 * - Resolves calendar overlaps
 */

import { WorkflowExecutionEngine } from '@/lib/engine/executor';

export interface FreeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  formattedDisplay: string;
}

export class SmartSchedulingService {
  /**
   * Finds available meeting slots during working hours (9:00 AM - 5:00 PM) on a target date.
   */
  public static async findFreeSlots(
    targetDateIso: string,
    meetingDurationMinutes: number = 30
  ): Promise<FreeSlot[]> {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const date = new Date(targetDateIso);

    // Working hours: 09:00 to 17:00
    const workStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0);
    const workEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0);

    const events = await adapters.calendar.listEvents({
      timeMin: workStart.toISOString(),
      timeMax: workEnd.toISOString()
    });

    // Sort events by start time
    const sorted = [...events].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const freeSlots: FreeSlot[] = [];
    let currentPointer = workStart.getTime();
    const bufferMs = 15 * 60 * 1000; // 15-minute buffer between meetings

    for (const evt of sorted) {
      const evtStart = new Date(evt.startTime).getTime();
      const evtEnd = new Date(evt.endTime).getTime();

      if (evtStart > currentPointer) {
        const gapMinutes = Math.floor((evtStart - currentPointer) / (60 * 1000));
        if (gapMinutes >= meetingDurationMinutes) {
          const slotEnd = new Date(currentPointer + meetingDurationMinutes * 60 * 1000);
          freeSlots.push({
            startTime: new Date(currentPointer).toISOString(),
            endTime: slotEnd.toISOString(),
            durationMinutes: meetingDurationMinutes,
            formattedDisplay: `${new Date(currentPointer).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          });
        }
      }

      currentPointer = Math.max(currentPointer, evtEnd + bufferMs);
    }

    // Check remaining time until workEnd
    if (workEnd.getTime() - currentPointer >= meetingDurationMinutes * 60 * 1000) {
      const slotEnd = new Date(currentPointer + meetingDurationMinutes * 60 * 1000);
      freeSlots.push({
        startTime: new Date(currentPointer).toISOString(),
        endTime: slotEnd.toISOString(),
        durationMinutes: meetingDurationMinutes,
        formattedDisplay: `${new Date(currentPointer).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      });
    }

    return freeSlots;
  }
}
