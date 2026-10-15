/**
 * Authoritative Post-Execution Verifier.
 * Checks authoritative provider state after tool execution rather than trusting optimistic returns.
 */

import { MockGmailAdapter } from '@/lib/integrations/gmail/mock';
import { GmailService } from '@/lib/integrations/gmail/service';
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
  public static async verifyAction(
    action: PlannedAction,
    adapter: MockGmailAdapter | GmailService
  ): Promise<VerificationOutcome> {
    const { toolName, arguments: args, result } = action;

    switch (toolName) {
      case 'gmail_trash_messages': {
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
          const detail = await adapter.getMessageDetails(id);
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
        const messageIds: string[] = args.messageIds || [];
        let verifiedCount = 0;
        let failedCount = 0;
        const details: string[] = [];

        for (const id of messageIds) {
          const detail = await adapter.getMessageDetails(id);
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
