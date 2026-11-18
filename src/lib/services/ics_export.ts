/**
 * RFC 5545 iCalendar (.ics) Export Service.
 *
 * Converts scheduled calendar events and executive travel itineraries into a standard
 * VCALENDAR (.ics) feed importable into Apple Calendar, Outlook, Google Calendar, or Thunderbird.
 */

import { CalendarEvent } from '@/lib/integrations/calendar/types';
import { TripItinerary } from '@/types';

export class IcsCalendarExporter {
  private static formatIcsTimestamp(isoStr: string): string {
    const dt = new Date(isoStr);
    if (Number.isNaN(dt.getTime())) {
      return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    }
    return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  private static escapeIcsText(val: string = ''): string {
    return val
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  public static generateIcsCalendar(
    events: CalendarEvent[],
    trips: TripItinerary[] = []
  ): string {
    const nowStamp = this.formatIcsTimestamp(new Date().toISOString());
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OpenSource AIVirtualAssistant//Executive Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    for (const evt of events) {
      if (evt.status === 'cancelled') continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${evt.id}@virtual-assistant.local`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART:${this.formatIcsTimestamp(evt.startTime)}`,
        `DTEND:${this.formatIcsTimestamp(evt.endTime)}`,
        `SUMMARY:${this.escapeIcsText(evt.summary)}`,
        `DESCRIPTION:${this.escapeIcsText(evt.description || '')}`,
        ...(evt.location ? [`LOCATION:${this.escapeIcsText(evt.location)}`] : []),
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    }

    for (const trip of trips) {
      for (const fl of trip.flights || []) {
        lines.push(
          'BEGIN:VEVENT',
          `UID:flight_${trip.id}_${fl.flightNumber.replace(/\s+/g, '')}@virtual-assistant.local`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART:${this.formatIcsTimestamp(fl.departureTime)}`,
          `DTEND:${this.formatIcsTimestamp(fl.arrivalTime)}`,
          `SUMMARY:${this.escapeIcsText(`✈️ ${fl.airline} ${fl.flightNumber} (${fl.departureAirport} -> ${fl.arrivalAirport})`)}`,
          `DESCRIPTION:${this.escapeIcsText(`Confirmation: ${fl.confirmationCode} | Seat: ${fl.seat || 'Assigned'}`)}`,
          `LOCATION:${this.escapeIcsText(`${fl.departureAirport} Airport`)}`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        );
      }
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}
