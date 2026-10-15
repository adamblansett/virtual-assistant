/**
 * Live Telegram Bot Client & Webhook Service.
 * 
 * Replaces human assistant mobile messaging:
 * - Ingests text and voice messages from Telegram chat
 * - Dispatches interactive approval gates with inline keyboard buttons
 * - Handles callback queries when executive taps Approve or Reject
 * - Supports live API calls with graceful fallback to deterministic test doubles
 */

import { OmnichannelIngestionService } from './omnichannel';
import { MobileApprovalService } from './mobile_approvals';

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramOutboundRecord {
  chatId: string | number;
  text: string;
  replyMarkup?: TelegramInlineKeyboardMarkup;
  timestamp: string;
}

export class TelegramBotService {
  private static outboundLog: TelegramOutboundRecord[] = [];

  /**
   * Returns whether a live Telegram bot token is configured.
   */
  public static hasLiveToken(): boolean {
    return Boolean(process.env.TELEGRAM_BOT_TOKEN);
  }

  /**
   * Returns outbound message log (useful for testing and monitoring).
   */
  public static getOutboundLog(): TelegramOutboundRecord[] {
    return [...this.outboundLog];
  }

  /**
   * Clears the outbound log.
   */
  public static clearOutboundLog(): void {
    this.outboundLog = [];
  }

  /**
   * Sends a message to a Telegram chat.
   */
  public static async sendMessage(
    chatId: string | number,
    text: string,
    replyMarkup?: TelegramInlineKeyboardMarkup
  ): Promise<{ success: boolean; messageId?: number }> {
    const record: TelegramOutboundRecord = {
      chatId,
      text,
      replyMarkup,
      timestamp: new Date().toISOString()
    };
    this.outboundLog.push(record);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      // Offline / test double mode
      return { success: true, messageId: Math.floor(Math.random() * 100000) };
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          reply_markup: replyMarkup,
          parse_mode: 'HTML'
        })
      });
      const data = await res.json();
      return { success: data.ok, messageId: data.result?.message_id };
    } catch {
      return { success: false };
    }
  }

  /**
   * Dispatches an executive action approval request with inline Approve / Reject buttons.
   */
  public static async sendApprovalPrompt(
    chatId: string | number,
    actionDescription: string,
    approvalToken: string
  ): Promise<boolean> {
    const text = `⚠️ <b>Executive Approval Required</b>\n\n"${actionDescription}" requires your explicit authorization to proceed.\n\nTap below to decide:`;
    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: '✓ Approve & Execute', callback_data: `appr:${approvalToken}` },
          { text: '✕ Reject', callback_data: `rejt:${approvalToken}` }
        ]
      ]
    };

    const res = await this.sendMessage(chatId, text, keyboard);
    return res.success;
  }

  /**
   * Processes a webhook update received from Telegram Bot API.
   */
  public static async handleWebhookUpdate(update: any): Promise<{
    handled: boolean;
    type: 'message' | 'callback_query' | 'unknown';
    response?: any;
  }> {
    // 1. Handle Inline Button Callback Queries (Approve / Reject)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data || '';
      const chatId = cq.message?.chat?.id;

      if (data.startsWith('appr:') || data.startsWith('rejt:')) {
        const approved = data.startsWith('appr:');
        const token = data.slice(5);

        const decisionResult = await MobileApprovalService.processMobileDecision(token, approved);
        const replyText = approved
          ? `✓ <b>Authorized</b>: Action approved and executed.\n\n${decisionResult.message}`
          : `✕ <b>Rejected</b>: Action cancelled upon your instruction.`;

        if (chatId) {
          await this.sendMessage(chatId, replyText);
        }

        return {
          handled: true,
          type: 'callback_query',
          response: { approved, token, decisionResult }
        };
      }

      return { handled: true, type: 'callback_query' };
    }

    // 2. Handle Inbound Chat Messages (Text or Voice)
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const text = msg.text || '';
      const isVoice = Boolean(msg.voice || msg.audio);
      const audioUrl = isVoice ? `https://api.telegram.org/file/voice_${msg.voice?.file_id || 'memo'}.oga` : undefined;

      const omniResponse = await OmnichannelIngestionService.processInboundMessage({
        channel: isVoice ? 'voice_note' : 'telegram',
        senderId: String(chatId),
        senderName: msg.from?.first_name || 'Executive',
        text,
        audioUrl,
        timestamp: new Date().toISOString()
      });

      if (omniResponse.requiresApproval && omniResponse.approvalToken) {
        await this.sendApprovalPrompt(chatId, text || 'Action item', omniResponse.approvalToken);
      } else if (chatId) {
        await this.sendMessage(chatId, omniResponse.replyText);
      }

      return {
        handled: true,
        type: 'message',
        response: omniResponse
      };
    }

    return { handled: false, type: 'unknown' };
  }
}
