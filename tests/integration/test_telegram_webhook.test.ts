import { describe, it, expect, beforeEach } from 'vitest';
import { TelegramBotService } from '@/lib/services/telegram';
import { OmnichannelIngestionService } from '@/lib/services/omnichannel';
import { AppStorage } from '@/lib/storage/db';
import { GET as getTelegramWebhook, POST as postTelegramWebhook } from '@/app/api/webhooks/telegram/route';
import { NextRequest } from 'next/server';

describe('Telegram Bot & Webhook Gateway Service', () => {
  beforeEach(() => {
    AppStorage.reset();
    TelegramBotService.clearOutboundLog();
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it('correctly reports token configuration status', () => {
    expect(TelegramBotService.hasLiveToken()).toBe(false);
    process.env.TELEGRAM_BOT_TOKEN = 'mock_telegram_token_123';
    expect(TelegramBotService.hasLiveToken()).toBe(true);
  });

  it('records outbound message in log when running offline / mock', async () => {
    const res = await TelegramBotService.sendMessage(12345, 'Hello Executive');
    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();

    const log = TelegramBotService.getOutboundLog();
    expect(log.length).toBe(1);
    expect(log[0].chatId).toBe(12345);
    expect(log[0].text).toBe('Hello Executive');
  });

  it('dispatches interactive approval prompt with inline keyboard markup', async () => {
    const res = await TelegramBotService.sendApprovalPrompt(
      998877,
      'Move 45 qualifying messages to Trash',
      'tok_exec_456'
    );
    expect(res).toBe(true);

    const log = TelegramBotService.getOutboundLog();
    expect(log.length).toBe(1);
    expect(log[0].chatId).toBe(998877);
    expect(log[0].text).toContain('Executive Approval Required');
    expect(log[0].replyMarkup?.inline_keyboard[0][0].callback_data).toBe('appr:tok_exec_456');
    expect(log[0].replyMarkup?.inline_keyboard[0][1].callback_data).toBe('rejt:tok_exec_456');
  });

  it('handles inbound text webhook message and triggers task planning', async () => {
    const update = {
      update_id: 10001,
      message: {
        message_id: 42,
        from: { id: 7771, first_name: 'Alex' },
        chat: { id: 7771, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Find open 30 min meeting slots for tomorrow'
      }
    };

    const outcome = await TelegramBotService.handleWebhookUpdate(update);
    expect(outcome.handled).toBe(true);
    expect(outcome.type).toBe('message');
    expect(outcome.response.recipientId).toBe('7771');
    expect(outcome.response.replyText).toContain('Completed');

    // Confirm outbound response was sent to the chat
    const log = TelegramBotService.getOutboundLog();
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].chatId).toBe(7771);
  });

  it('handles inbound voice memo webhook message and routes to voice_note pipeline', async () => {
    const update = {
      update_id: 10002,
      message: {
        message_id: 43,
        from: { id: 7772, first_name: 'Alex' },
        chat: { id: 7772, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        voice: {
          file_id: 'voice_memo_abc123',
          duration: 12
        }
      }
    };

    const outcome = await TelegramBotService.handleWebhookUpdate(update);
    expect(outcome.handled).toBe(true);
    expect(outcome.type).toBe('message');
    expect(outcome.response.channel).toBe('voice_note');
  });

  it('handles interactive approval callback query (appr:<token>) and executes pending plan', async () => {
    const inbound = await OmnichannelIngestionService.processInboundMessage({
      channel: 'telegram',
      senderId: '8881',
      text: 'Send email to board@example.com'
    });
    expect(inbound.requiresApproval).toBe(true);
    const token = inbound.approvalToken!;

    const update = {
      update_id: 10003,
      callback_query: {
        id: 'cb_query_001',
        from: { id: 8881, first_name: 'Alex' },
        message: {
          message_id: 50,
          chat: { id: 8881 }
        },
        data: `appr:${token}`
      }
    };

    const outcome = await TelegramBotService.handleWebhookUpdate(update);
    expect(outcome.handled).toBe(true);
    expect(outcome.type).toBe('callback_query');
    expect(outcome.response?.approved).toBe(true);

    // Verify storage updated
    const status = AppStorage.getMobileApproval(token);
    expect(status?.status).toBe('approved');

    // Verify outbound confirmation sent
    const log = TelegramBotService.getOutboundLog();
    const lastMsg = log[log.length - 1];
    expect(lastMsg.chatId).toBe(8881);
    expect(lastMsg.text).toContain('Authorized');
  });

  it('handles interactive rejection callback query (rejt:<token>) and cancels action', async () => {
    const inbound = await OmnichannelIngestionService.processInboundMessage({
      channel: 'telegram',
      senderId: '8882',
      text: 'Send email to external@example.com'
    });
    expect(inbound.requiresApproval).toBe(true);
    const token = inbound.approvalToken!;

    const update = {
      update_id: 10004,
      callback_query: {
        id: 'cb_query_002',
        from: { id: 8882, first_name: 'Alex' },
        message: {
          message_id: 51,
          chat: { id: 8882 }
        },
        data: `rejt:${token}`
      }
    };

    const outcome = await TelegramBotService.handleWebhookUpdate(update);
    expect(outcome.handled).toBe(true);
    expect(outcome.response?.approved).toBe(false);

    const status = AppStorage.getMobileApproval(token);
    expect(status?.status).toBe('rejected');

    const log = TelegramBotService.getOutboundLog();
    const lastMsg = log[log.length - 1];
    expect(lastMsg.chatId).toBe(8882);
    expect(lastMsg.text).toContain('Rejected');
  });

  it('verifies GET and POST route handlers in Next.js API', async () => {
    // Test GET
    const getRes = await getTelegramWebhook();
    const getData = await getRes.json();
    expect(getData.status).toBe('active');
    expect(getData.webhook).toBe('telegram');

    // Test POST
    const req = new NextRequest('http://localhost:3000/api/webhooks/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        update_id: 99999,
        message: {
          text: 'Help me prepare for my 2pm meeting',
          chat: { id: 1111 }
        }
      })
    });

    const postRes = await postTelegramWebhook(req);
    const postData = await postRes.json();
    expect(postData.ok).toBe(true);
    expect(postData.result.handled).toBe(true);
  });
});
