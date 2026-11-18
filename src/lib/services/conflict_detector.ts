/**
 * Proactive Executive Conflict & Anomaly Detector Service.
 *
 * Scans across Calendar, Travel Itineraries, Corporate Expenses, and VIP Contacts to flag:
 * 1. Overlapping / double-booked calendar meetings
 * 2. Back-to-back meetings violating the 15-minute executive buffer rule
 * 3. Physical location mismatches between Calendar meetings and Travel Itineraries
 * 4. Duplicate expense charges and anomalous spend spikes
 * 5. Overdue VIP relationship cadences
 */

import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { OutboundWebhookBus } from './webhook_bus';

export interface ExecutiveConflictItem {
  id: string;
  type:
    | 'calendar_overlap'
    | 'buffer_violation'
    | 'location_mismatch'
    | 'duplicate_expense'
    | 'anomalous_spend'
    | 'vip_overdue';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedIds: string[];
  suggestedPrompt: string;
  detectedAt: string;
}

export class ConflictDetectorService {
  public static async scanAllConflicts(): Promise<{
    totalConflicts: number;
    highSeverityCount: number;
    conflicts: ExecutiveConflictItem[];
    scannedAt: string;
  }> {
    AppStorage.initialize();
    const detectedAt = new Date().toISOString();
    const conflicts: ExecutiveConflictItem[] = [];

    // 1. Calendar Overlaps & Buffer Violations
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    let events: any[] = [];
    try {
      events = await adapters.calendar.listEvents({
        timeMin: new Date(Date.now() - 24 * 3600000).toISOString(),
        maxResults: 100
      });
    } catch {
      events = [];
    }

    const activeEvents = events
      .filter(e => e.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    for (let i = 0; i < activeEvents.length - 1; i++) {
      const a = activeEvents[i];
      const b = activeEvents[i + 1];
      const endA = new Date(a.startTime ? a.endTime : 0).getTime();
      const startB = new Date(b.startTime).getTime();

      if (startB < endA) {
        conflicts.push({
          id: `conf_overlap_${a.id}_${b.id}`,
          type: 'calendar_overlap',
          severity: 'high',
          title: `Double-Booked Meeting Conflict: "${a.summary}" & "${b.summary}"`,
          description: `"${b.summary}" starts at ${new Date(b.startTime).toLocaleTimeString()} before "${a.summary}" ends at ${new Date(a.endTime).toLocaleTimeString()}.`,
          affectedIds: [a.id, b.id],
          suggestedPrompt: `Find an open 30 minute slot tomorrow to reschedule "${b.summary}"`,
          detectedAt
        });
      } else {
        const gapMinutes = Math.round((startB - endA) / 60000);
        if (gapMinutes >= 0 && gapMinutes < 15) {
          conflicts.push({
            id: `conf_buffer_${a.id}_${b.id}`,
            type: 'buffer_violation',
            severity: 'medium',
            title: `Buffer Rule Violation (${gapMinutes}m gap): "${a.summary}" -> "${b.summary}"`,
            description: `Only ${gapMinutes} minute(s) between consecutive meetings (executive policy requires a 15-minute buffer).`,
            affectedIds: [a.id, b.id],
            suggestedPrompt: `Coordinate rescheduling "${b.summary}" to add a 15-minute buffer`,
            detectedAt
          });
        }
      }
    }

    // 2. Travel vs. Calendar Location Mismatch
    const trips = AppStorage.listTrips();
    const knownCities = ['boston', 'new york', 'nyc', 'san francisco', 'sfo', 'chicago', 'london', 'austin'];
    for (const evt of activeEvents) {
      const locLower = String(evt.location || '').toLowerCase();
      if (!locLower || locLower.includes('zoom') || locLower.includes('meet') || locLower.includes('virtual')) {
        continue;
      }
      const evtTime = new Date(evt.startTime).getTime();
      for (const trip of trips) {
        const tripStart = new Date(trip.startDate).getTime() - 12 * 3600000;
        const tripEnd = new Date(trip.endDate).getTime() + 12 * 3600000;
        if (evtTime >= tripStart && evtTime <= tripEnd) {
          const destLower = trip.destination.toLowerCase();
          const mentionedCity = knownCities.find(c => locLower.includes(c));
          if (mentionedCity && !destLower.includes(mentionedCity)) {
            conflicts.push({
              id: `conf_loc_${evt.id}_${trip.id}`,
              type: 'location_mismatch',
              severity: 'high',
              title: `Travel Location Conflict: "${evt.summary}" vs. Trip to ${trip.destination}`,
              description: `In-person meeting at "${evt.location}" conflicts with active travel itinerary in ${trip.destination}.`,
              affectedIds: [evt.id, trip.id],
              suggestedPrompt: `Draft an email to attendees of "${evt.summary}" switching the meeting to virtual Google Meet due to travel in ${trip.destination}`,
              detectedAt
            });
          }
        }
      }
    }

    // 3. Duplicate Expense Charges & Anomalous Spend
    const expenses = AppStorage.listExpenses();
    const seenExpenseKeys = new Map<string, string>();
    for (const exp of expenses) {
      const key = `${exp.merchant.toLowerCase().trim()}|${exp.amount.toFixed(2)}|${exp.date}`;
      const existingId = seenExpenseKeys.get(key);
      if (existingId) {
        conflicts.push({
          id: `conf_dup_exp_${existingId}_${exp.id}`,
          type: 'duplicate_expense',
          severity: 'high',
          title: `Potential Duplicate Charge: ${exp.merchant} ($${exp.amount.toFixed(2)})`,
          description: `Two identical charges of $${exp.amount.toFixed(2)} from ${exp.merchant} recorded on ${exp.date}.`,
          affectedIds: [existingId, exp.id],
          suggestedPrompt: `Search my emails for receipts from ${exp.merchant} to verify duplicate billing`,
          detectedAt
        });
      } else {
        seenExpenseKeys.set(key, exp.id);
      }

      if (exp.amount >= 2000) {
        conflicts.push({
          id: `conf_spend_${exp.id}`,
          type: 'anomalous_spend',
          severity: 'medium',
          title: `High-Value Expense Alert: ${exp.merchant} ($${exp.amount.toFixed(2)})`,
          description: `Single expenditure of $${exp.amount.toFixed(2)} (${exp.category}) exceeds $2,000 executive audit threshold.`,
          affectedIds: [exp.id],
          suggestedPrompt: `Summarize recent expenses and receipts`,
          detectedAt
        });
      }
    }

    // 4. VIP Relationship Cadence Drift
    const contacts = AppStorage.listContacts();
    const nowMs = Date.now();
    for (const c of contacts) {
      if (!c.isVIP || !c.lastContactedAt) continue;
      const daysAgo = Math.floor((nowMs - new Date(c.lastContactedAt).getTime()) / 86400000);
      if (daysAgo > c.followUpCadenceDays) {
        conflicts.push({
          id: `conf_vip_${c.id}`,
          type: 'vip_overdue',
          severity: 'low',
          title: `VIP Follow-Up Overdue: ${c.name} (${c.company})`,
          description: `Last contacted ${daysAgo} days ago (target cadence: every ${c.followUpCadenceDays} days).`,
          affectedIds: [c.id],
          suggestedPrompt: `Ghostwrite a follow-up email reply to ${c.email} checking in on our partnership`,
          detectedAt
        });
      }
    }

    const highSeverityCount = conflicts.filter(c => c.severity === 'high').length;

    if (conflicts.length > 0) {
      await OutboundWebhookBus.emitEvent('conflict.detected', {
        totalConflicts: conflicts.length,
        highSeverityCount,
        conflicts: conflicts.slice(0, 5)
      });
    }

    return {
      totalConflicts: conflicts.length,
      highSeverityCount,
      conflicts,
      scannedAt: detectedAt
    };
  }
}
