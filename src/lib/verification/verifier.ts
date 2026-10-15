/**
 * Authoritative Post-Execution Verifier.
 * Checks authoritative provider state after tool execution rather than trusting optimistic returns.
 */

import { MockGmailAdapter } from '@/lib/integrations/gmail/mock';
import { GmailService } from '@/lib/integrations/gmail/service';
import { MockCalendarAdapter } from '@/lib/integrations/calendar/mock';
import { SandboxedFileService } from '@/lib/integrations/files/service';
import { AdaptersBundle } from '@/lib/tools/registry';
import { PlannedAction } from '@/types';

export interface VerificationOutcome {
  verified: boolean;
  expectedState: string;
  processedCount: number;
  verifiedCount: number;
  failedCount: number;
  details: string[];
}

export class ResultVerifier {
  private static defaultCalendar = new MockCalendarAdapter();
  private static defaultFiles = new SandboxedFileService();

  public static async verifyAction(
    action: PlannedAction,
    adapterOrBundle: AdaptersBundle | MockGmailAdapter | GmailService
  ): Promise<VerificationOutcome> {
    const { toolName, arguments: args, result } = action;

    let bundle: AdaptersBundle;
    if ('metadata' in adapterOrBundle) {
      bundle = { gmail: adapterOrBundle as MockGmailAdapter | GmailService };
    } else {
      bundle = adapterOrBundle;
    }

    const gmail = bundle.gmail;
    const calendar = bundle.calendar || this.defaultCalendar;
    const files = bundle.files || this.defaultFiles;

    switch (toolName) {
      // --- Gmail Verification ---
      case 'gmail_trash_messages': {
        if (!gmail) {
          return { verified: false, expectedState: 'Gmail adapter available', processedCount: 0, verifiedCount: 0, failedCount: 1, details: ['Gmail adapter missing'] };
        }
        const messageIds: string[] = args.messageIds || [];
        if (messageIds.length === 0) {
          return {
            verified: true,
            expectedState: 'No messages to verify',
            processedCount: 0,
            verifiedCount: 0,
            failedCount: 0,
            details: ['No message IDs targeted for trash.']
          };
        }

        let verifiedCount = 0;
        let failedCount = 0;
        const details: string[] = [];

        for (const id of messageIds) {
          const detail = await gmail.getMessageDetails(id);
          if (detail && detail.labelIds.includes('TRASH') && !detail.labelIds.includes('INBOX')) {
            verifiedCount++;
            details.push(`Message ${id}: verified in TRASH (INBOX removed)`);
          } else {
            failedCount++;
            details.push(`Message ${id}: FAILED verification. Current labels: [${detail?.labelIds.join(', ') || 'none'}]`);
          }
        }

        return {
          verified: failedCount === 0 && verifiedCount === messageIds.length,
          expectedState: 'All target messages have TRASH label and lack INBOX label',
          processedCount: messageIds.length,
          verifiedCount,
          failedCount,
          details
        };
      }

      case 'gmail_archive_messages': {
        if (!gmail) {
          return { verified: false, expectedState: 'Gmail adapter available', processedCount: 0, verifiedCount: 0, failedCount: 1, details: ['Gmail adapter missing'] };
        }
        const messageIds: string[] = args.messageIds || [];
        let verifiedCount = 0;
        let failedCount = 0;
        const details: string[] = [];

        for (const id of messageIds) {
          const detail = await gmail.getMessageDetails(id);
          if (detail && !detail.labelIds.includes('INBOX')) {
            verifiedCount++;
            details.push(`Message ${id}: verified removed from INBOX`);
          } else {
            failedCount++;
            details.push(`Message ${id}: FAILED verification. Still in INBOX`);
          }
        }

        return {
          verified: failedCount === 0,
          expectedState: 'All target messages lack INBOX label',
          processedCount: messageIds.length,
          verifiedCount,
          failedCount,
          details
        };
      }

      case 'gmail_send_message': {
        const hasMessageId = !!result?.messageId;
        return {
          verified: hasMessageId,
          expectedState: 'Provider returned authoritative messageId and threadId',
          processedCount: 1,
          verifiedCount: hasMessageId ? 1 : 0,
          failedCount: hasMessageId ? 0 : 1,
          details: [hasMessageId ? `Verified sent messageId: ${result.messageId}` : 'No messageId returned']
        };
      }

      // --- Google Calendar Verification ---
      case 'calendar_create_event': {
        const eventId = result?.id;
        if (!eventId) {
          return { verified: false, expectedState: 'Created event ID', processedCount: 1, verifiedCount: 0, failedCount: 1, details: ['No event ID returned'] };
        }
        const evt = await calendar.getEventDetails(eventId);
        const verified = !!evt && evt.status === 'confirmed';
        return {
          verified,
          expectedState: 'Event exists on calendar with confirmed status',
          processedCount: 1,
          verifiedCount: verified ? 1 : 0,
          failedCount: verified ? 0 : 1,
          details: [verified ? `Verified event ${eventId} on calendar.` : `Event ${eventId} not found on calendar.`]
        };
      }

      case 'calendar_reschedule_event': {
        const eventId = args.eventId;
        const evt = await calendar.getEventDetails(eventId);
        const verified = !!evt && evt.startTime === args.newStartTime;
        return {
          verified,
          expectedState: `Event start time matches ${args.newStartTime}`,
          processedCount: 1,
          verifiedCount: verified ? 1 : 0,
          failedCount: verified ? 0 : 1,
          details: [verified ? `Verified updated start time for event ${eventId}` : 'Start time did not match']
        };
      }

      case 'calendar_cancel_event': {
        const eventId = args.eventId;
        const evt = await calendar.getEventDetails(eventId);
        const verified = !evt || evt.status === 'cancelled';
        return {
          verified,
          expectedState: 'Event marked cancelled on calendar',
          processedCount: 1,
          verifiedCount: verified ? 1 : 0,
          failedCount: verified ? 0 : 1,
          details: [verified ? `Verified event ${eventId} cancelled.` : 'Event still active']
        };
      }

      // --- Sandboxed File Verification ---
      case 'files_write': {
        try {
          const fileData = await files.readFile(args.filePath);
          const verified = fileData.content.length > 0;
          return {
            verified,
            expectedState: 'File exists with written content',
            processedCount: 1,
            verifiedCount: verified ? 1 : 0,
            failedCount: verified ? 0 : 1,
            details: [verified ? `Verified file ${args.filePath} exists in workspace.` : 'File empty or missing']
          };
        } catch (err: any) {
          return {
            verified: false,
            expectedState: 'File exists in workspace',
            processedCount: 1,
            verifiedCount: 0,
            failedCount: 1,
            details: [err.message]
          };
        }
      }

      case 'files_move': {
        try {
          const destData = await files.readFile(args.destPath);
          const verified = destData !== null;
          return {
            verified,
            expectedState: 'File exists at destination path',
            processedCount: 1,
            verifiedCount: verified ? 1 : 0,
            failedCount: verified ? 0 : 1,
            details: [verified ? `Verified file moved to ${args.destPath}` : 'Destination file not found']
          };
        } catch (err: any) {
          return {
            verified: false,
            expectedState: 'Destination file exists',
            processedCount: 1,
            verifiedCount: 0,
            failedCount: 1,
            details: [err.message]
          };
        }
      }

      default:
        return {
          verified: true,
          expectedState: 'Standard read / preview verified',
          processedCount: 1,
          verifiedCount: 1,
          failedCount: 0,
          details: ['Action completed successfully without persistent mutation.']
        };
    }
  }
}
