import { describe, it, expect, beforeEach } from 'vitest';
import { OmnichannelIngestionService } from '@/lib/services/omnichannel';
import { MobileApprovalService } from '@/lib/services/mobile_approvals';
import { AppStorage } from '@/lib/storage/db';

describe('Omnichannel Ingestion & Mobile Approval Gate Service', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('transcribes voice note audio and executes natural language request', async () => {
    const response = await OmnichannelIngestionService.processInboundMessage({
      channel: 'voice_note',
      senderId: 'tg_user_9921',
      text: '',
      audioUrl: 'https://cdn.example.com/voice_memos/briefing_memo.wav'
    });

    expect(response.channel).toBe('voice_note');
    expect(response.recipientId).toBe('tg_user_9921');
    expect(response.requiresApproval).toBe(false);
    expect(response.replyText).toContain('Completed');
  });

  it('ingests text message from Slack and returns immediate execution response for read actions', async () => {
    const response = await OmnichannelIngestionService.processInboundMessage({
      channel: 'slack',
      senderId: 'U0192834',
      text: 'Find open 30 min meeting slots for tomorrow'
    });

    expect(response.channel).toBe('slack');
    expect(response.recipientId).toBe('U0192834');
    expect(response.requiresApproval).toBe(false);
    expect(response.replyText).toContain('Completed');
  });

  it('intercepts consequential operations and generates mobile approval token with push notification prompt', async () => {
    const response = await OmnichannelIngestionService.processInboundMessage({
      channel: 'telegram',
      senderId: 'chat_88291',
      text: 'Clean up emails older than 5 years'
    });

    expect(response.requiresApproval).toBe(true);
    expect(response.approvalToken).toBeDefined();
    expect(response.replyText).toContain('Authorization Required');
    expect(response.replyText).toContain('APPROVE');

    // Verify token registered in storage
    const storedApproval = AppStorage.getMobileApproval(response.approvalToken!);
    expect(storedApproval).toBeDefined();
    expect(storedApproval?.status).toBe('pending');
  });

  it('resumes paused plan execution when executive authorizes action remotely via mobile callback', async () => {
    const response = await OmnichannelIngestionService.processInboundMessage({
      channel: 'whatsapp',
      senderId: '+14155552671',
      text: 'Send email to colleague@example.com'
    });

    expect(response.requiresApproval).toBe(true);
    const token = response.approvalToken!;

    // Mobile remote approve callback
    const result = await MobileApprovalService.processMobileDecision(token, true);
    expect(result.success).toBe(true);
    expect(result.message).toContain('approved and successfully executed');
    expect(result.plan?.status).toBe('succeeded');

    // Verify token status updated to approved
    const updatedApproval = AppStorage.getMobileApproval(token);
    expect(updatedApproval?.status).toBe('approved');
  });

  it('safely cancels execution when executive rejects the mobile approval callback', async () => {
    const response = await OmnichannelIngestionService.processInboundMessage({
      channel: 'telegram',
      senderId: 'chat_88291',
      text: 'Send email to colleague@example.com'
    });

    const token = response.approvalToken!;

    // Mobile remote reject callback
    const result = await MobileApprovalService.processMobileDecision(token, false);
    expect(result.success).toBe(true);
    expect(result.message).toContain('rejected');
    expect(result.plan?.status).toBe('rejected');

    // Verify token status updated to rejected
    const updatedApproval = AppStorage.getMobileApproval(token);
    expect(updatedApproval?.status).toBe('rejected');
  });
});
