/**
 * Deterministic Mock AI Provider.
 * Allows reproducible testing of conversational planning and tool invocation without API costs.
 */

import { IAIProviderAdapter, AIMessage, AIToolDeclaration, AIResponse, AIToolCall } from './types';

export class MockAIProvider implements IAIProviderAdapter {
  public async generateCompletion(
    messages: AIMessage[],
    _tools?: AIToolDeclaration[],
    _options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResponse> {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const lower = lastUserMessage.toLowerCase();

    const toolCalls: AIToolCall[] = [];
    let text = '';

    if (lower.includes('clean') && (lower.includes('older than') || lower.includes('5 year') || lower.includes('five year'))) {
      text = "I have drafted a structured plan to search for and preview emails older than five years, filter out protected categories like tax documents and starred notes, and request your approval before moving the qualifying messages to Trash.";
      toolCalls.push({
        id: `call_${Date.now()}_1`,
        name: 'gmail_preview_cleanup',
        arguments: {
          olderThanYears: 5
        }
      });
    } else if (lower.includes('search') || lower.includes('find email')) {
      text = "Searching your emails according to your criteria...";
      toolCalls.push({
        id: `call_${Date.now()}_search`,
        name: 'gmail_search',
        arguments: {
          query: lastUserMessage
        }
      });
    } else if (lower.includes('send') && lower.includes('email to')) {
      text = "I have prepared a draft and require your explicit authorization to send this email.";
      toolCalls.push({
        id: `call_${Date.now()}_send`,
        name: 'gmail_send_message',
        arguments: {
          to: 'colleague@example.com',
          subject: 'Requested Update',
          body: 'Here is the update you asked for.'
        }
      });
    } else {
      text = "I am your AI Virtual Assistant. I can help manage your Gmail messages, clean up old emails with safety checks, create drafts, and automate workflow tasks with strict authorization controls.";
    }

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: 120,
        completionTokens: 45,
        totalTokens: 165
      },
      provider: 'mock',
      model: 'deterministic-mock-v1'
    };
  }
}
