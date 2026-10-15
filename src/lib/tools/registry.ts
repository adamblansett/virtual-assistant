/**
 * Central Tool Registry.
 * Defines typed tool schemas, permission requirements, risk levels, and dispatchers
 * for Gmail, Google Calendar, and Sandboxed File System.
 */

import { z } from 'zod';
import { ActionRiskLevel } from '@/types';
import { MockGmailAdapter } from '@/lib/integrations/gmail/mock';
import { GmailService } from '@/lib/integrations/gmail/service';
import { MockCalendarAdapter } from '@/lib/integrations/calendar/mock';
import { 
  ListEventsArgsSchema, 
  CreateEventArgsSchema, 
  RescheduleEventArgsSchema, 
  CancelEventArgsSchema 
} from '@/lib/integrations/calendar/types';
import { SandboxedFileService } from '@/lib/integrations/files/service';
import { PolicyEngine } from '@/lib/policy/engine';
import { UserPreferences, TaskItem } from '@/types';
import { AppStorage } from '@/lib/storage/db';
import { ExecutiveBriefingService } from '@/lib/services/briefing';
import { InboxTriageService } from '@/lib/services/inbox_triage';
import { SmartSchedulingService } from '@/lib/services/scheduling';
import { MeetingPrepService } from '@/lib/services/meeting_prep';
import { TravelItineraryService } from '@/lib/services/travel';
import { AssistantAutomationService } from '@/lib/services/automation';

export interface ToolDefinition {
  name: string;
  integration: string;
  description: string;
  schema: z.ZodObject<any>;
  riskLevel: ActionRiskLevel;
  requiredPermission: string;
  approvalRequiredByDefault: boolean;
}

// --- Gmail Schemas ---
export const GmailSearchArgsSchema = z.object({
  query: z.string().optional(),
  olderThanYears: z.number().optional(),
  beforeDate: z.string().optional(),
  afterDate: z.string().optional(),
  from: z.string().optional(),
  label: z.string().optional(),
  isUnread: z.boolean().optional(),
  maxResults: z.number().min(1).max(500).default(50)
});

export const GmailTrashArgsSchema = z.object({
  messageIds: z.array(z.string()).min(1, 'At least one message ID must be provided.')
});

export const GmailArchiveArgsSchema = z.object({
  messageIds: z.array(z.string()).min(1, 'At least one message ID must be provided.')
});

export const GmailApplyLabelArgsSchema = z.object({
  messageIds: z.array(z.string()).min(1),
  addLabelIds: z.array(z.string()).min(1),
  removeLabelIds: z.array(z.string()).default([])
});

export const GmailDraftArgsSchema = z.object({
  to: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1)
});

export const GmailSendArgsSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1)
});

export const GmailVerifyStateArgsSchema = z.object({
  messageIds: z.array(z.string()).min(1),
  expectedLabel: z.string().default('TRASH')
});

// --- File Schemas ---
export const FileListArgsSchema = z.object({
  subDir: z.string().default('')
});

export const FileReadArgsSchema = z.object({
  filePath: z.string().min(1),
  maxBytes: z.number().default(50000)
});

export const FileWriteArgsSchema = z.object({
  filePath: z.string().min(1),
  content: z.string()
});

export const FileMoveArgsSchema = z.object({
  sourcePath: z.string().min(1),
  destPath: z.string().min(1)
});

// --- Executive VA Schemas ---
export const DailyBriefingArgsSchema = z.object({});

export const InboxTriageArgsSchema = z.object({});

export const FindFreeSlotsArgsSchema = z.object({
  targetDateIso: z.string().default(() => new Date(Date.now() + 86400000).toISOString()),
  durationMinutes: z.number().min(15).max(480).default(30)
});

export const TaskCreateArgsSchema = z.object({
  title: z.string().min(1, 'Task title is required.'),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  dueDate: z.string().optional()
});

export const TaskListArgsSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled', 'all']).default('all')
});

export const ContactSearchArgsSchema = z.object({
  query: z.string().default('')
});

export const ExpenseSummarizeArgsSchema = z.object({});
 
export const MeetingPrepareDossierArgsSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required.')
});

export const MeetingProcessNotesArgsSchema = z.object({
  meetingTitle: z.string().min(1, 'Meeting title is required.'),
  rawNotes: z.string().min(1, 'Raw notes content is required.'),
  attendees: z.array(z.string()).default([])
});

export const TravelListTripsArgsSchema = z.object({});

export const TravelExtractReservationsArgsSchema = z.object({});

export const TravelCreateItineraryArgsSchema = z.object({
  destination: z.string().min(1, 'Destination is required.'),
  purpose: z.string().min(1, 'Purpose is required.'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export const AssistantRunRoutineArgsSchema = z.object({
  routineType: z.enum(['morning_briefing', 'evening_wrapup', 'weekly_audit'])
});

export interface AdaptersBundle {
  gmail?: MockGmailAdapter | GmailService;
  calendar?: MockCalendarAdapter;
  files?: SandboxedFileService;
}

export interface InitializedAdaptersBundle {
  gmail: MockGmailAdapter | GmailService;
  calendar: MockCalendarAdapter;
  files: SandboxedFileService;
}

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();
  private static defaultCalendar = new MockCalendarAdapter();
  private static defaultFiles = new SandboxedFileService();

  static {
    // --- Gmail Tools ---
    this.registerTool({
      name: 'gmail_search',
      integration: 'gmail',
      description: 'Search messages in Gmail with date, sender, and label filters.',
      schema: GmailSearchArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'gmail.readonly',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'gmail_preview_cleanup',
      integration: 'gmail',
      description: 'Search and preview old messages qualifying for cleanup, applying protected category filters.',
      schema: GmailSearchArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'gmail.readonly',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'gmail_trash_messages',
      integration: 'gmail',
      description: 'Move approved messages to the Trash folder (reversible within 30 days).',
      schema: GmailTrashArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'gmail.modify',
      approvalRequiredByDefault: true
    });

    this.registerTool({
      name: 'gmail_archive_messages',
      integration: 'gmail',
      description: 'Archive messages by removing the INBOX label.',
      schema: GmailArchiveArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'gmail.modify',
      approvalRequiredByDefault: true
    });

    this.registerTool({
      name: 'gmail_apply_label',
      integration: 'gmail',
      description: 'Add or remove labels from messages.',
      schema: GmailApplyLabelArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'gmail.modify',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'gmail_create_draft',
      integration: 'gmail',
      description: 'Create an email draft without sending.',
      schema: GmailDraftArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'gmail.compose',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'gmail_send_message',
      integration: 'gmail',
      description: 'Send an email to a recipient (consequential action).',
      schema: GmailSendArgsSchema,
      riskLevel: 'consequential',
      requiredPermission: 'gmail.send',
      approvalRequiredByDefault: true
    });

    this.registerTool({
      name: 'gmail_verify_trash_state',
      integration: 'gmail',
      description: 'Verify that target messages are currently in the TRASH state on the provider.',
      schema: GmailVerifyStateArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'gmail.readonly',
      approvalRequiredByDefault: false
    });

    // --- Google Calendar Tools ---
    this.registerTool({
      name: 'calendar_list_events',
      integration: 'google_calendar',
      description: 'List scheduled calendar events within a given time range.',
      schema: ListEventsArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'calendar.readonly',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'calendar_create_event',
      integration: 'google_calendar',
      description: 'Create a new calendar event with summary, time, and optional attendees.',
      schema: CreateEventArgsSchema,
      riskLevel: 'consequential',
      requiredPermission: 'calendar.events',
      approvalRequiredByDefault: true
    });

    this.registerTool({
      name: 'calendar_reschedule_event',
      integration: 'google_calendar',
      description: 'Reschedule an existing calendar event to a new start and end time.',
      schema: RescheduleEventArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'calendar.events',
      approvalRequiredByDefault: true
    });

    this.registerTool({
      name: 'calendar_cancel_event',
      integration: 'google_calendar',
      description: 'Cancel a calendar event.',
      schema: CancelEventArgsSchema,
      riskLevel: 'consequential',
      requiredPermission: 'calendar.events',
      approvalRequiredByDefault: true
    });

    // --- Sandboxed File Tools ---
    this.registerTool({
      name: 'files_list',
      integration: 'sandboxed_files',
      description: 'List files and folders within the safe workspace directory.',
      schema: FileListArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'files.read',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'files_read',
      integration: 'sandboxed_files',
      description: 'Read contents of a text file inside the safe workspace.',
      schema: FileReadArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'files.read',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'files_write',
      integration: 'sandboxed_files',
      description: 'Write text content to a file inside the safe workspace.',
      schema: FileWriteArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'files.write',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'files_move',
      integration: 'sandboxed_files',
      description: 'Move or organize a file within the safe workspace directory.',
      schema: FileMoveArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'files.write',
      approvalRequiredByDefault: true
    });

    // --- Executive Virtual Assistant Tools ---
    this.registerTool({
      name: 'assistant_daily_briefing',
      integration: 'assistant',
      description: 'Generates the executive daily morning briefing: schedule, urgent emails, follow-ups, and pending tasks.',
      schema: DailyBriefingArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'assistant.read',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'assistant_triage_inbox',
      integration: 'assistant',
      description: 'Triages inbox messages into action-required, financial records, and low-priority newsletters.',
      schema: InboxTriageArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'gmail.readonly',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'calendar_find_free_slots',
      integration: 'google_calendar',
      description: 'Finds available meeting time slots on a given date considering working hours and buffer times.',
      schema: FindFreeSlotsArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'calendar.readonly',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'tasks_create',
      integration: 'assistant',
      description: 'Adds an action item to the executive task and to-do list with priority and optional deadline.',
      schema: TaskCreateArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'tasks.write',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'tasks_list',
      integration: 'assistant',
      description: 'Lists pending and active tasks on the executive to-do list.',
      schema: TaskListArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'tasks.read',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'contacts_search',
      integration: 'assistant',
      description: 'Searches executive contacts, partners, clients, and VIP relationship history.',
      schema: ContactSearchArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'contacts.read',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'finance_summarize_expenses',
      integration: 'assistant',
      description: 'Aggregates recent receipts and expenses into a categorized financial summary.',
      schema: ExpenseSummarizeArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'finance.read',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'meeting_prepare_dossier',
      integration: 'assistant',
      description: 'Compiles an executive briefing dossier for an upcoming meeting with attendee profiles, past notes, and agenda talking points.',
      schema: MeetingPrepareDossierArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'calendar.readonly',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'meeting_process_notes',
      integration: 'assistant',
      description: 'Processes raw meeting notes, automatically extracts action item tasks, and formats an executive follow-up email recap.',
      schema: MeetingProcessNotesArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'tasks.write',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'travel_list_trips',
      integration: 'assistant',
      description: 'Lists all scheduled business trips and executive travel itineraries.',
      schema: TravelListTripsArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'assistant.read',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'travel_extract_reservations',
      integration: 'assistant',
      description: 'Scans email inbox for airline, hotel, and car rental confirmations to aggregate into travel itineraries.',
      schema: TravelExtractReservationsArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'gmail.readonly',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'travel_create_itinerary',
      integration: 'assistant',
      description: 'Creates a complete travel itinerary with flight segments, hotel bookings, and syncs events to the executive calendar.',
      schema: TravelCreateItineraryArgsSchema,
      riskLevel: 'reversible_write',
      requiredPermission: 'calendar.events',
      approvalRequiredByDefault: false
    });

    this.registerTool({
      name: 'assistant_run_routine',
      integration: 'assistant',
      description: 'Executes proactive assistant recurring routines: morning_briefing, evening_wrapup, or weekly_audit.',
      schema: AssistantRunRoutineArgsSchema,
      riskLevel: 'read',
      requiredPermission: 'assistant.read',
      approvalRequiredByDefault: false
    });
  }

  public static registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public static getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public static listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Executes a tool with schema validation and safe dispatch.
   */
  public static async executeTool(
    toolName: string,
    rawArgs: Record<string, any>,
    adapterOrBundle?: AdaptersBundle | MockGmailAdapter | GmailService,
    preferences?: UserPreferences
  ): Promise<any> {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" is not registered in the system.`);
    }

    // 1. Strict schema validation
    tool.schema.parse(rawArgs);

    // Normalize adapters
    let bundle: AdaptersBundle;
    if (!adapterOrBundle) {
      bundle = { gmail: new MockGmailAdapter() };
    } else if ('metadata' in adapterOrBundle) {
      bundle = { gmail: adapterOrBundle as MockGmailAdapter | GmailService };
    } else {
      bundle = adapterOrBundle;
    }

    const gmail = bundle.gmail;
    const calendar = bundle.calendar || this.defaultCalendar;
    const files = bundle.files || this.defaultFiles;
    const userPrefs = preferences || AppStorage.getPreferences();

    // 2. Dispatch with typed schema parsing
    switch (toolName) {
      // --- Gmail Tools ---
      case 'gmail_search': {
        if (!gmail) throw new Error('Gmail adapter not configured.');
        const args = GmailSearchArgsSchema.parse(rawArgs);
        return gmail.searchMessages(args);
      }

      case 'gmail_preview_cleanup': {
        if (!gmail) throw new Error('Gmail adapter not configured.');
        const args = GmailSearchArgsSchema.parse(rawArgs);
        const searchRes = await gmail.searchMessages(args);
        const { safeMessages, protectedMessages } = PolicyEngine.filterProtectedMessages(
          searchRes.messages,
          userPrefs
        );
        return {
          totalFound: searchRes.messages.length,
          qualifyingCount: safeMessages.length,
          protectedCount: protectedMessages.length,
          qualifyingIds: safeMessages.map(m => m.id),
          qualifyingSample: safeMessages.slice(0, 5).map(m => `[${m.date.split('T')[0]}] ${m.sender}: "${m.subject}"`),
          protectedSample: protectedMessages.slice(0, 5).map(m => `[PROTECTED - ${m.sender}]: "${m.subject}"`)
        };
      }

      case 'gmail_trash_messages': {
        if (!gmail) throw new Error('Gmail adapter not configured.');
        const args = GmailTrashArgsSchema.parse(rawArgs);
        return gmail.trashMessages(args.messageIds);
      }

      case 'gmail_archive_messages': {
        if (!gmail) throw new Error('Gmail adapter not configured.');
        const args = GmailArchiveArgsSchema.parse(rawArgs);
        return gmail.archiveMessages(args.messageIds);
      }

      case 'gmail_apply_label': {
        if (!gmail) throw new Error('Gmail adapter not configured.');
        const args = GmailApplyLabelArgsSchema.parse(rawArgs);
        return gmail.applyLabels(args.messageIds, args.addLabelIds, args.removeLabelIds);
      }

      case 'gmail_create_draft': {
        if (!gmail) throw new Error('Gmail adapter not configured.');
        const args = GmailDraftArgsSchema.parse(rawArgs);
        return gmail.createDraft(args.to, args.subject, args.body);
      }

      case 'gmail_send_message': {
        if (!gmail) throw new Error('Gmail adapter not configured.');
        const args = GmailSendArgsSchema.parse(rawArgs);
        return gmail.sendMessage(args.to, args.subject, args.body);
      }

      case 'gmail_verify_trash_state': {
        if (!gmail) throw new Error('Gmail adapter not configured.');
        const args = GmailVerifyStateArgsSchema.parse(rawArgs);
        const expectedLabel = args.expectedLabel || 'TRASH';
        const verificationResults: Array<{ id: string; verified: boolean; labels: string[] }> = [];

        for (const id of args.messageIds) {
          const detail = await gmail.getMessageDetails(id);
          const hasLabel = detail ? detail.labelIds.includes(expectedLabel) : false;
          verificationResults.push({
            id,
            verified: hasLabel,
            labels: detail?.labelIds || []
          });
        }

        const allVerified = verificationResults.every(r => r.verified);
        return {
          allVerified,
          verifiedCount: verificationResults.filter(r => r.verified).length,
          totalCount: args.messageIds.length,
          details: verificationResults
        };
      }

      // --- Google Calendar Tools ---
      case 'calendar_list_events': {
        const args = ListEventsArgsSchema.parse(rawArgs);
        return calendar.listEvents(args);
      }

      case 'calendar_create_event': {
        const args = CreateEventArgsSchema.parse(rawArgs);
        return calendar.createEvent(args);
      }

      case 'calendar_reschedule_event': {
        const args = RescheduleEventArgsSchema.parse(rawArgs);
        return calendar.rescheduleEvent(args);
      }

      case 'calendar_cancel_event': {
        const args = CancelEventArgsSchema.parse(rawArgs);
        return calendar.cancelEvent(args.eventId);
      }

      // --- Sandboxed File Tools ---
      case 'files_list': {
        const args = FileListArgsSchema.parse(rawArgs);
        return files.listFiles(args.subDir);
      }

      case 'files_read': {
        const args = FileReadArgsSchema.parse(rawArgs);
        return files.readFile(args.filePath, args.maxBytes);
      }

      case 'files_write': {
        const args = FileWriteArgsSchema.parse(rawArgs);
        return files.writeFile(args.filePath, args.content);
      }

      case 'files_move': {
        const args = FileMoveArgsSchema.parse(rawArgs);
        return files.moveFile(args.sourcePath, args.destPath);
      }

      // --- Executive Virtual Assistant Tools ---
      case 'assistant_daily_briefing': {
        return ExecutiveBriefingService.generateBriefing();
      }

      case 'assistant_triage_inbox': {
        return InboxTriageService.triageInbox();
      }

      case 'calendar_find_free_slots': {
        const args = FindFreeSlotsArgsSchema.parse(rawArgs);
        return SmartSchedulingService.findFreeSlots(args.targetDateIso, args.durationMinutes);
      }

      case 'tasks_create': {
        const args = TaskCreateArgsSchema.parse(rawArgs);
        const task: TaskItem = {
          id: `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: args.title,
          description: args.description,
          priority: args.priority,
          status: 'todo',
          dueDate: args.dueDate,
          source: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        AppStorage.saveTask(task);
        return { success: true, task };
      }

      case 'tasks_list': {
        const args = TaskListArgsSchema.parse(rawArgs);
        const tasks = AppStorage.listTasks();
        if (args.status === 'all') return tasks;
        return tasks.filter(t => t.status === args.status);
      }

      case 'contacts_search': {
        const args = ContactSearchArgsSchema.parse(rawArgs);
        return AppStorage.searchContacts(args.query);
      }

      case 'finance_summarize_expenses': {
        const expenses = AppStorage.listExpenses();
        const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const byCategory = expenses.reduce((acc: Record<string, number>, curr) => {
          acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
          return acc;
        }, {});
        return {
          totalAmount,
          currency: 'USD',
          count: expenses.length,
          byCategory,
          expenses
        };
      }

      case 'meeting_prepare_dossier': {
        const args = MeetingPrepareDossierArgsSchema.parse(rawArgs);
        return await MeetingPrepService.prepareMeetingDossier(args.meetingId);
      }

      case 'meeting_process_notes': {
        const args = MeetingProcessNotesArgsSchema.parse(rawArgs);
        return await MeetingPrepService.processMeetingNotes(args.meetingTitle, args.rawNotes, args.attendees);
      }

      case 'travel_list_trips': {
        return TravelItineraryService.listTrips();
      }

      case 'travel_extract_reservations': {
        return await TravelItineraryService.extractReservationsFromInbox();
      }

      case 'travel_create_itinerary': {
        const args = TravelCreateItineraryArgsSchema.parse(rawArgs);
        return await TravelItineraryService.createTripItinerary(args);
      }

      case 'assistant_run_routine': {
        const args = AssistantRunRoutineArgsSchema.parse(rawArgs);
        return await AssistantAutomationService.runRoutine(args.routineType);
      }

      default:
        throw new Error(`Execution handler not implemented for tool: ${toolName}`);
    }
  }
}
