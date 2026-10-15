import { z } from 'zod';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  timeZone: string;
  attendees: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  location?: string;
}

export const ListEventsArgsSchema = z.object({
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
  query: z.string().optional(),
  maxResults: z.number().min(1).max(250).optional()
});
export type ListEventsArgs = z.infer<typeof ListEventsArgsSchema>;

export const CreateEventArgsSchema = z.object({
  summary: z.string().min(1, 'Event summary is required.'),
  description: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required (ISO format).'),
  endTime: z.string().min(1, 'End time is required (ISO format).'),
  timeZone: z.string().optional().default('America/New_York'),
  attendees: z.array(z.string().email()).optional().default([]),
  location: z.string().optional()
});
export type CreateEventArgs = z.input<typeof CreateEventArgsSchema>;

export const RescheduleEventArgsSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required.'),
  newStartTime: z.string().min(1, 'New start time is required.'),
  newEndTime: z.string().min(1, 'New end time is required.')
});
export type RescheduleEventArgs = z.infer<typeof RescheduleEventArgsSchema>;

export const CancelEventArgsSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required.')
});
export type CancelEventArgs = z.infer<typeof CancelEventArgsSchema>;
