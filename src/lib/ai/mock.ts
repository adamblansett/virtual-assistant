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
    } else if (
      lower.includes('calendar') || 
      lower.includes('meeting') || 
      lower.includes('schedule') || 
      lower.includes('free slot') || 
      lower.includes('open time') || 
      lower.includes('availability')
    ) {
      if (
        lower.includes('free slot') || 
        lower.includes('open time') || 
        lower.includes('find time') || 
        lower.includes('open') || 
        lower.includes('availability') ||
        (lower.includes('find') && (lower.includes('min') || lower.includes('slot')))
      ) {
        text = "Searching for open meeting slots on your calendar...";
        let durationMinutes = 30;
        const durMatch = lower.match(/(\d+)\s*(?:min|minute)/);
        if (durMatch) {
          durationMinutes = parseInt(durMatch[1], 10);
        }
        toolCalls.push({
          id: `call_${Date.now()}_free_slots`,
          name: 'calendar_find_free_slots',
          arguments: {
            targetDateIso: new Date(Date.now() + 86400000).toISOString(),
            durationMinutes
          }
        });
      } else if (lower.includes('create') || lower.includes('new event') || lower.includes('schedule a meeting')) {
        text = "I have prepared a plan to schedule this calendar event.";
        toolCalls.push({
          id: `call_${Date.now()}_cal_create`,
          name: 'calendar_create_event',
          arguments: {
            summary: 'Team Sync',
            startTime: new Date(Date.now() + 86400000).toISOString(),
            endTime: new Date(Date.now() + 90000000).toISOString(),
            description: 'Scheduled via Virtual Assistant'
          }
        });
      } else if (lower.includes('cancel')) {
        text = "I will request confirmation to cancel this calendar event.";
        toolCalls.push({
          id: `call_${Date.now()}_cal_cancel`,
          name: 'calendar_cancel_event',
          arguments: {
            eventId: 'evt_sync_01'
          }
        });
      } else {
        text = "Checking your upcoming calendar events...";
        toolCalls.push({
          id: `call_${Date.now()}_cal_list`,
          name: 'calendar_list_events',
          arguments: {
            timeMin: new Date().toISOString()
          }
        });
      }
    } else if (lower.includes('briefing') || lower.includes('what\'s on my plate') || lower.includes('daily agenda') || lower.includes('morning brief')) {
      text = "Preparing your executive morning briefing...";
      toolCalls.push({
        id: `call_${Date.now()}_briefing`,
        name: 'assistant_daily_briefing',
        arguments: {}
      });
    } else if (lower.includes('triage') || (lower.includes('sort') && lower.includes('inbox'))) {
      text = "Triaging your inbox for action items, follow-ups, and financial records...";
      toolCalls.push({
        id: `call_${Date.now()}_triage`,
        name: 'assistant_triage_inbox',
        arguments: {}
      });
    } else if (lower.includes('task') || lower.includes('to-do') || lower.includes('todo') || lower.includes('remind me') || lower.includes('action item')) {
      if (lower.includes('add') || lower.includes('create') || lower.includes('remind me') || lower.includes('new task')) {
        text = "Adding action item to your executive task list...";
        toolCalls.push({
          id: `call_${Date.now()}_task_create`,
          name: 'tasks_create',
          arguments: {
            title: lastUserMessage.replace(/remind me to:?/i, '').replace(/add task:?/i, '').replace(/create task:?/i, '').trim() || 'Executive task item',
            priority: lower.includes('urgent') || lower.includes('high') ? 'high' : 'medium'
          }
        });
      } else {
        text = "Retrieving your active task list...";
        toolCalls.push({
          id: `call_${Date.now()}_task_list`,
          name: 'tasks_list',
          arguments: {
            status: 'todo'
          }
        });
      }
    } else if (lower.includes('contact') || lower.includes('vip') || lower.includes('who is')) {
      text = "Searching executive contacts and relationship history...";
      toolCalls.push({
        id: `call_${Date.now()}_contact_search`,
        name: 'contacts_search',
        arguments: {
          query: lastUserMessage.replace(/search contact:?/i, '').replace(/who is/i, '').trim()
        }
      });
    } else if (lower.includes('expense') || lower.includes('spending') || lower.includes('receipt')) {
      text = "Aggregating your recent receipts and expenses...";
      toolCalls.push({
        id: `call_${Date.now()}_expenses`,
        name: 'finance_summarize_expenses',
        arguments: {}
      });
    } else if (lower.includes('file') || lower.includes('workspace')) {
      if (lower.includes('list')) {
        text = "Listing files in your sandboxed workspace...";
        toolCalls.push({
          id: `call_${Date.now()}_files_list`,
          name: 'files_list',
          arguments: {}
        });
      } else if (lower.includes('read')) {
        text = "Reading requested file from sandbox...";
        toolCalls.push({
          id: `call_${Date.now()}_files_read`,
          name: 'files_read',
          arguments: {
            filePath: 'notes.txt'
          }
        });
      } else if (lower.includes('write') || lower.includes('save')) {
        text = "Writing file to sandboxed workspace...";
        toolCalls.push({
          id: `call_${Date.now()}_files_write`,
          name: 'files_write',
          arguments: {
            filePath: 'output.txt',
            content: 'Automated test output'
          }
        });
      }
    } else if (lower.includes('transfer') || lower.includes('bank') || lower.includes('pizza') || lower.includes('drone') || lower.includes('stock')) {
      text = "I cannot fulfill this request. I do not have financial, ordering, or physical hardware integrations. My supported integrations are Gmail, Google Calendar, and Sandboxed Files.";
    } else if (lower.trim() === 'help' || lower.includes('what can you do') || lower.includes('make it better') || lower.includes('do something')) {
      text = "Please specify what you would like me to assist you with. I can manage your Gmail messages, check or schedule Google Calendar events, and organize files in your workspace sandbox.";
    } else {
      text = "I am your AI Virtual Assistant. I can help manage your Gmail messages, clean up old emails with safety checks, schedule calendar meetings, and manage workspace files with strict authorization controls.";
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
