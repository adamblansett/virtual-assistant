/**
 * Shadow Executive Background Draft Engine.
 *
 * Continuously evaluates inbound executive communications and automatically prepares
 * personalized, in-voice email draft replies ready for 1-tap mobile or dashboard authorization.
 */

import { AppStorage } from '@/lib/storage/db';
import { ShadowDraft } from '@/types';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { ExecutiveGhostwriterService } from './ghostwriter';
import { InboxTriageService } from './inbox_triage';
import { OutboundWebhookBus } from './webhook_bus';
import { TelegramBotService } from './telegram';

export class ShadowDraftService {
  /**
   * Scans unread triageable messages and prepares in-voice shadow drafts.
   */
  public static async scanAndGenerateShadowDrafts(): Promise<{
    scannedCount: number;
    draftsCreated: number;
    drafts: ShadowDraft[];
  }> {
    AppStorage.initialize();
    const existingDrafts = AppStorage.listShadowDrafts();
    const existingMsgIds = new Set(existingDrafts.map(d => d.messageId));

    const triageReport = await InboxTriageService.triageInbox();
    const actionable = triageReport.items.filter(c =>
      c.category === 'needs_action' || c.isVIP
    );

    const newlyCreated: ShadowDraft[] = [];
    const voiceProfile = AppStorage.getVoiceProfile();

    for (const item of actionable) {
      if (existingMsgIds.has(item.messageId)) {
        continue;
      }

      // Generate in-voice draft reply
      const reply = await ExecutiveGhostwriterService.ghostwriteReply({
        recipient: item.sender,
        subject: item.subject.toLowerCase().startsWith('re:') ? item.subject : `Re: ${item.subject}`,
        inquiryContext: `Email subject: "${item.subject}". Action suggested: ${item.actionSuggested}`,
        executiveInstructions: 'Be prompt, professional, and directly address the inquiry adhering to executive voice profile.'
      });

      const draft: ShadowDraft = {
        id: `drf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        messageId: item.messageId,
        threadId: item.messageId,
        recipient: item.sender,
        subject: reply.subject,
        proposedBody: reply.body,
        tone: voiceProfile.tone || 'direct_professional',
        status: 'pending_review',
        sourceInquiry: item.subject,
        confidenceScore: 0.94,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      AppStorage.saveShadowDraft(draft);
      newlyCreated.push(draft);
      existingMsgIds.add(item.messageId);

      // Emit outbound webhook
      await OutboundWebhookBus.emitEvent('shadow_draft.created', {
        draftId: draft.id,
        recipient: draft.recipient,
        subject: draft.subject,
        snippet: draft.proposedBody.slice(0, 100)
      });

      // Dispatch Telegram approval notification if configured
      if (TelegramBotService.hasLiveToken()) {
        try {
          const chatId = AppStorage.getIntegrationConfig()?.telegramChatId || '12345678';
          await TelegramBotService.sendMessage(
            chatId,
            `*New Shadow Email Draft Prepared*\n\n` +
            `*To:* \`${draft.recipient}\`\n` +
            `*Subject:* ${draft.subject}\n\n` +
            `"${draft.proposedBody.slice(0, 240)}..."\n\n` +
            `Tap below to authorize or discard:`,
            {
              inline_keyboard: [
                [
                  { text: '✓ Send Now', callback_data: `appr_shadow:${draft.id}` },
                  { text: '✕ Discard', callback_data: `disc_shadow:${draft.id}` }
                ]
              ]
            }
          );
        } catch {
          // Ignore notification delivery failure
        }
      }
    }

    return {
      scannedCount: triageReport.items.length,
      draftsCreated: newlyCreated.length,
      drafts: newlyCreated
    };
  }

  /**
   * Approves and delivers a shadow draft via the Gmail adapter.
   */
  public static async approveAndSendDraft(draftId: string): Promise<{
    success: boolean;
    sentMessageId?: string;
    error?: string;
  }> {
    AppStorage.initialize();
    const draft = AppStorage.getShadowDraft(draftId);
    if (!draft) {
      return { success: false, error: `Draft ${draftId} not found` };
    }

    if (draft.status === 'approved_sent') {
      return { success: true, error: 'Draft was already sent.' };
    }

    try {
      const adapters = WorkflowExecutionEngine.getAdaptersBundle();
      const sendResult = await adapters.gmail.sendMessage(
        draft.recipient,
        draft.subject,
        draft.proposedBody
      );

      draft.status = 'approved_sent';
      draft.updatedAt = new Date().toISOString();
      AppStorage.saveShadowDraft(draft);

      await OutboundWebhookBus.emitEvent('shadow_draft.sent', {
        draftId: draft.id,
        recipient: draft.recipient,
        subject: draft.subject,
        sentMessageId: sendResult.messageId
      });

      return {
        success: true,
        sentMessageId: sendResult.messageId
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed sending email draft'
      };
    }
  }

  /**
   * Revises the text of a shadow draft.
   */
  public static reviseDraft(draftId: string, revisedBody: string): {
    success: boolean;
    draft?: ShadowDraft;
    error?: string;
  } {
    AppStorage.initialize();
    const draft = AppStorage.getShadowDraft(draftId);
    if (!draft) {
      return { success: false, error: `Draft ${draftId} not found` };
    }

    draft.proposedBody = revisedBody;
    draft.status = 'revised';
    draft.updatedAt = new Date().toISOString();
    AppStorage.saveShadowDraft(draft);

    return { success: true, draft };
  }

  /**
   * Discards a shadow draft without sending.
   */
  public static discardDraft(draftId: string): {
    success: boolean;
    error?: string;
  } {
    AppStorage.initialize();
    const draft = AppStorage.getShadowDraft(draftId);
    if (!draft) {
      return { success: false, error: `Draft ${draftId} not found` };
    }

    draft.status = 'discarded';
    draft.updatedAt = new Date().toISOString();
    AppStorage.saveShadowDraft(draft);

    return { success: true };
  }
}
