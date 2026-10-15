/**
 * Omnichannel & Voice Note Ingestion Service.
 * 
 * Replaces human assistant communication reception:
 * - Ingests requests across Telegram, WhatsApp, Slack, SMS, and audio voice notes
 * - Transcribes incoming audio voice notes into structured text intents
 * - Dispatches requests through the four-phase execution pipeline
 * - Returns formatted, channel-optimized responses and mobile authorization prompts
 */

import { OmnichannelMessage, OmnichannelResponse } from '@/types';
import { MockAIProvider } from '@/lib/ai/mock';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { TaskPlanner } from '@/lib/planner/planner';
import { AppStorage } from '@/lib/storage/db';

export class OmnichannelIngestionService {
  /**
   * Transcribes audio voice notes into natural language intent.
   */
  public static async transcribeVoiceNote(audioUrl: string): Promise<string> {
    // Deterministic offline audio transcription double
    const lower = audioUrl.toLowerCase();
    if (lower.includes('briefing') || lower.includes('morning')) {
      return 'Give me my morning briefing';
    }
    if (lower.includes('task') || lower.includes('todo')) {
      return 'Add task: Call Marcus regarding partnership agreement';
    }
    if (lower.includes('flight') || lower.includes('travel')) {
      return 'What is the status of my flight DL 428?';
    }
    return 'Summarize my schedule and top priority tasks for today';
  }

  /**
   * Ingests and processes an inbound message from any connected communication channel.
   */
  public static async processInboundMessage(message: OmnichannelMessage): Promise<OmnichannelResponse> {
    let promptText = message.text.trim();

    // Transcribe audio if voice note
    if (message.channel === 'voice_note' || (!promptText && message.audioUrl)) {
      promptText = await this.transcribeVoiceNote(message.audioUrl || 'audio_memo.wav');
    }

    if (!promptText) {
      return {
        channel: message.channel,
        recipientId: message.senderId,
        replyText: 'I received an empty voice note or message. Please specify how I can assist you.',
        requiresApproval: false
      };
    }

    // Pass through AI planning
    const prefs = AppStorage.getPreferences();
    const ai = new MockAIProvider();
    const planner = new TaskPlanner(ai, prefs);
    const plan = await planner.createPlan(promptText);

    if (plan.actions.length === 0) {
      return {
        channel: message.channel,
        recipientId: message.senderId,
        replyText: plan.summary || 'Understood. How else can I assist you?',
        requiresApproval: false
      };
    }

    // Execute plan
    const { plan: executedPlan, summary } = await WorkflowExecutionEngine.executePlan(plan, false);
    const planId = executedPlan.id;

    if (executedPlan.status === 'awaiting_approval') {
      const approvalToken = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      AppStorage.createMobileApproval(planId, approvalToken);

      const replyText = `⚠️ Authorization Required:\n"${promptText}" requires your explicit approval to proceed.\n\nReply "APPROVE ${approvalToken}" or tap to authorize.`;

      return {
        channel: message.channel,
        recipientId: message.senderId,
        replyText,
        requiresApproval: true,
        planId,
        approvalToken
      };
    }

    const replyText = `✓ Completed (${message.channel.toUpperCase()}):\n${summary.explanation}`;

    return {
      channel: message.channel,
      recipientId: message.senderId,
      replyText,
      requiresApproval: false,
      planId
    };
  }
}
