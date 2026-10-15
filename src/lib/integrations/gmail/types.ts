import { z } from 'zod';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  sender: string;
  recipient: string;
  subject: string;
  snippet: string;
  date: string; // ISO string
  timestampMs: number;
  labelIds: string[];
  isRead: boolean;
  isStarred: boolean;
}

export interface GmailSearchResult {
  messages: GmailMessageSummary[];
  totalEstimated: number;
  nextPageToken?: string;
}

export const GmailSearchFilterSchema = z.object({
  query: z.string().optional(),
  olderThanYears: z.number().optional(),
  beforeDate: z.string().optional(), // YYYY-MM-DD
  afterDate: z.string().optional(),  // YYYY-MM-DD
  from: z.string().optional(),
  label: z.string().optional(),
  isUnread: z.boolean().optional(),
  maxResults: z.number().min(1).max(500).optional(),
  pageToken: z.string().optional()
});
export type GmailSearchFilter = z.infer<typeof GmailSearchFilterSchema>;

export interface GmailBatchOperationResult {
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  succeededIds: string[];
  failedIds: string[];
  skippedIds: string[];
  errors: Record<string, string>;
}
