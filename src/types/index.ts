import { z } from 'zod';

export const ActionRiskLevelSchema = z.enum([
  'read',              // Low risk: searching, listing, reading metadata
  'reversible_write', // Moderate risk: moving to trash, applying labels, archiving, creating draft
  'consequential',     // High impact: sending email, sharing access, modifying external state
  'high_risk'          // Extreme risk: permanent delete, arbitrary shell, billing
]);
export type ActionRiskLevel = z.infer<typeof ActionRiskLevelSchema>;

export const ActionExecutionStatusSchema = z.enum([
  'proposed',
  'awaiting_approval',
  'approved',
  'rejected',
  'running',
  'succeeded',
  'partially_succeeded',
  'failed',
  'cancelled'
]);
export type ActionExecutionStatus = z.infer<typeof ActionExecutionStatusSchema>;

export const VerificationStatusSchema = z.enum([
  'pending',
  'verified',
  'failed',
  'not_applicable'
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const PlannedActionSchema = z.object({
  id: z.string(),
  integration: z.string(),
  toolName: z.string(),
  arguments: z.record(z.string(), z.any()),
  requiredPermission: z.string(),
  targetResource: z.string(),
  expectedOutcome: z.string(),
  riskLevel: ActionRiskLevelSchema,
  approvalRequired: z.boolean(),
  status: ActionExecutionStatusSchema.default('proposed'),
  result: z.any().optional(),
  error: z.string().optional(),
  verificationStatus: VerificationStatusSchema.default('pending'),
  verificationDetails: z.string().optional(),
  idempotencyKey: z.string().optional(),
  retryCount: z.number().default(0)
});
export type PlannedAction = z.infer<typeof PlannedActionSchema>;

export const TaskPlanSchema = z.object({
  id: z.string(),
  userRequestId: z.string(),
  originalPrompt: z.string(),
  summary: z.string(),
  status: ActionExecutionStatusSchema.default('proposed'),
  actions: z.array(PlannedActionSchema),
  requiresUserConfirmation: z.boolean().default(false),
  confirmationPrompt: z.string().optional(),
  affectedResourcePreview: z.object({
    count: z.number(),
    description: z.string(),
    sampleItems: z.array(z.string()).default([])
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type TaskPlan = z.infer<typeof TaskPlanSchema>;

export const UserPreferencesSchema = z.object({
  userId: z.string().default('default_user'),
  timezone: z.string().default('America/New_York'),
  responseStyle: z.enum(['concise', 'detailed']).default('concise'),
  protectedEmailCategories: z.array(z.string()).default([
    'receipts', 'tax', 'legal', 'finance', 'bills', 'starred', 'important'
  ]),
  protectedEmailDomains: z.array(z.string()).default([
    'irs.gov', 'chase.com', 'bankofamerica.com', 'fidelity.com'
  ]),
  autoApproveReadOperations: z.boolean().default(true),
  requireExplicitSendApproval: z.boolean().default(true),
  requireBulkConfirmationThreshold: z.number().default(1),
  trashRetentionDays: z.number().default(30)
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  userId: z.string(),
  actionId: z.string(),
  integration: z.string(),
  toolName: z.string(),
  riskLevel: ActionRiskLevelSchema,
  approvedBy: z.string(), // e.g. "user_interactive", "policy_auto_read", "pre_authorized"
  parametersRedacted: z.record(z.string(), z.any()),
  executionStatus: ActionExecutionStatusSchema,
  verificationStatus: VerificationStatusSchema,
  error: z.string().optional(),
  durationMs: z.number().optional()
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export interface ExecutionSummary {
  planId: string;
  totalActions: number;
  succeeded: number;
  partiallySucceeded: number;
  failed: number;
  skipped: number;
  verified: number;
  verificationFailed: number;
  explanation: string;
}

// --- Executive VA Domain Models ---

export const TaskPrioritySchema = z.enum(['high', 'medium', 'low']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'completed', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: TaskPrioritySchema.default('medium'),
  status: TaskStatusSchema.default('todo'),
  dueDate: z.string().optional(),
  source: z.enum(['email', 'meeting', 'user', 'note', 'document']).default('user'),
  sourceRefId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type TaskItem = z.infer<typeof TaskItemSchema>;

export const ContactItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  role: z.string().optional(),
  isVIP: z.boolean().default(false),
  notes: z.array(z.string()).default([]),
  lastContactedAt: z.string().optional(),
  followUpCadenceDays: z.number().default(30),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ContactItem = z.infer<typeof ContactItemSchema>;

export const ExpenseRecordSchema = z.object({
  id: z.string(),
  merchant: z.string(),
  amount: z.number(),
  currency: z.string().default('USD'),
  date: z.string(),
  category: z.enum(['software', 'travel', 'meals', 'office', 'utilities', 'financial', 'other']).default('other'),
  source: z.string(),
  verified: z.boolean().default(true)
});
export type ExpenseRecord = z.infer<typeof ExpenseRecordSchema>;

export interface ExecutiveBriefing {
  date: string;
  greeting: string;
  scheduleSummary: string;
  todaysMeetings: Array<{ id: string; summary: string; time: string; location?: string }>;
  unreadUrgentEmails: Array<{ id: string; from: string; subject: string; snippet: string }>;
  pendingFollowUps: Array<{ to: string; subject: string; sentDaysAgo: number }>;
  dueTasks: TaskItem[];
  recentExpenses: { count: number; totalAmount: number; currency: string };
  summaryText: string;
}

// --- Meeting Intelligence & Dossier ---
export const MeetingDossierSchema = z.object({
  meetingId: z.string(),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  attendees: z.array(z.object({
    name: z.string(),
    email: z.string(),
    isVIP: z.boolean(),
    company: z.string().optional(),
    role: z.string().optional(),
    contextNotes: z.array(z.string()),
    recentEmailThreads: z.array(z.object({
      subject: z.string(),
      date: z.string(),
      snippet: z.string()
    }))
  })),
  relevantTasks: z.array(TaskItemSchema),
  executivePrepSummary: z.string(),
  talkingPoints: z.array(z.string())
});
export type MeetingDossier = z.infer<typeof MeetingDossierSchema>;

export const MeetingNotesProcessingResultSchema = z.object({
  extractedTasks: z.array(TaskItemSchema),
  followUpDraft: z.object({
    recipients: z.array(z.string()),
    subject: z.string(),
    body: z.string()
  }),
  summary: z.string()
});
export type MeetingNotesProcessingResult = z.infer<typeof MeetingNotesProcessingResultSchema>;

// --- Travel & Itinerary Coordination ---
export const FlightSegmentSchema = z.object({
  confirmationCode: z.string(),
  airline: z.string(),
  flightNumber: z.string(),
  departureAirport: z.string(),
  arrivalAirport: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  seat: z.string().optional(),
  status: z.enum(['confirmed', 'delayed', 'cancelled']).default('confirmed')
});
export type FlightSegment = z.infer<typeof FlightSegmentSchema>;

export const HotelReservationSchema = z.object({
  confirmationCode: z.string(),
  hotelName: z.string(),
  address: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  roomType: z.string().optional(),
  status: z.enum(['confirmed', 'cancelled']).default('confirmed')
});
export type HotelReservation = z.infer<typeof HotelReservationSchema>;

export const TripItinerarySchema = z.object({
  id: z.string(),
  destination: z.string(),
  purpose: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  flights: z.array(FlightSegmentSchema),
  hotel: HotelReservationSchema.optional(),
  dailySchedule: z.array(z.object({
    date: z.string(),
    events: z.array(z.object({
      time: z.string(),
      description: z.string(),
      type: z.enum(['flight', 'hotel', 'meeting', 'meal', 'transport', 'reminder']),
      location: z.string().optional()
    }))
  })),
  packingTips: z.array(z.string()).default([]),
  status: z.enum(['upcoming', 'in_progress', 'completed', 'cancelled']).default('upcoming')
});
export type TripItinerary = z.infer<typeof TripItinerarySchema>;

// --- Assistant Automation Routines ---
export const AssistantRoutineTypeSchema = z.enum(['morning_briefing', 'evening_wrapup', 'weekly_audit']);
export type AssistantRoutineType = z.infer<typeof AssistantRoutineTypeSchema>;

export const RoutineExecutionResultSchema = z.object({
  id: z.string(),
  routineType: AssistantRoutineTypeSchema,
  executedAt: z.string(),
  status: z.enum(['succeeded', 'failed']),
  summary: z.string(),
  generatedArtifacts: z.record(z.string(), z.any())
});
export type RoutineExecutionResult = z.infer<typeof RoutineExecutionResultSchema>;

// --- Executive Voice Matching & Email Ghostwriting ---
export const ExecutiveVoiceProfileSchema = z.object({
  tone: z.enum(['concise_professional', 'warm_executive', 'formal_corporate', 'casual_direct']).default('concise_professional'),
  typicalGreeting: z.string().default('Hi {{name}},'),
  typicalSignOff: z.string().default('Best regards,\nAdam'),
  formalityLevel: z.number().min(1).max(5).default(3),
  brevityPreference: z.enum(['ultra_brief', 'balanced', 'detailed']).default('balanced'),
  preferredPhrases: z.array(z.string()).default([]),
  avoidPhrases: z.array(z.string()).default([])
});
export type ExecutiveVoiceProfile = z.infer<typeof ExecutiveVoiceProfileSchema>;

export const GhostwriteRequestSchema = z.object({
  recipient: z.string(),
  subject: z.string(),
  inquiryContext: z.string(),
  executiveInstructions: z.string().optional(),
  voiceProfile: ExecutiveVoiceProfileSchema.optional()
});
export type GhostwriteRequest = z.infer<typeof GhostwriteRequestSchema>;

export const GhostwriteResultSchema = z.object({
  draftId: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  toneApplied: z.string(),
  suggestedAction: z.string()
});
export type GhostwriteResult = z.infer<typeof GhostwriteResultSchema>;

// --- Multi-Turn Email Scheduling Coordinator ---
export const SchedulingInquirySchema = z.object({
  sender: z.string(),
  meetingTopic: z.string(),
  rawInquiry: z.string(),
  durationMinutes: z.number().default(30),
  preferredTimeRange: z.string().optional()
});
export type SchedulingInquiry = z.infer<typeof SchedulingInquirySchema>;

export const SchedulingProposalResultSchema = z.object({
  inquirySender: z.string(),
  meetingTopic: z.string(),
  proposedSlots: z.array(z.object({
    startIso: z.string(),
    endIso: z.string(),
    formattedWindow: z.string()
  })),
  responseDraft: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string()
  }),
  status: z.enum(['slots_proposed', 'meeting_booked', 'conflict_detected'])
});
export type SchedulingProposalResult = z.infer<typeof SchedulingProposalResultSchema>;

// --- PDF & Receipt OCR Extraction ---
export const ParsedReceiptItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
  quantity: z.number().default(1)
});
export type ParsedReceiptItem = z.infer<typeof ParsedReceiptItemSchema>;

export const ParsedReceiptSchema = z.object({
  receiptId: z.string(),
  merchantName: z.string(),
  transactionDate: z.string(),
  currency: z.string().default('USD'),
  totalAmount: z.number(),
  taxAmount: z.number().default(0),
  category: z.enum(['software', 'travel', 'meals', 'office', 'utilities', 'financial', 'other']),
  lineItems: z.array(ParsedReceiptItemSchema),
  confidenceScore: z.number().min(0).max(1),
  rawDocumentSnippet: z.string().optional()
});
export type ParsedReceipt = z.infer<typeof ParsedReceiptSchema>;

// --- Cloud Document & Drive Sync ---
export const CloudDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  mimeType: z.string(),
  path: z.string(),
  lastModified: z.string(),
  owner: z.string(),
  tags: z.array(z.string()).default([]),
  contentSnippet: z.string(),
  summary: z.string().optional()
});
export type CloudDocument = z.infer<typeof CloudDocumentSchema>;

// --- Real-Time Flight Status Tracking ---
export const FlightTrackingUpdateSchema = z.object({
  flightNumber: z.string(),
  airline: z.string(),
  departureAirport: z.string(),
  arrivalAirport: z.string(),
  scheduledDeparture: z.string(),
  estimatedDeparture: z.string(),
  scheduledArrival: z.string(),
  estimatedArrival: z.string(),
  status: z.enum(['on_time', 'delayed', 'boarding', 'in_air', 'landed', 'cancelled']),
  departureGate: z.string().optional(),
  arrivalGate: z.string().optional(),
  baggageCarousel: z.string().optional(),
  delayMinutes: z.number().default(0),
  alertMessage: z.string().optional()
});
export type FlightTrackingUpdate = z.infer<typeof FlightTrackingUpdateSchema>;

// --- Omnichannel & Mobile Approvals ---
export const OmnichannelMessageSchema = z.object({
  channel: z.enum(['telegram', 'whatsapp', 'slack', 'sms', 'voice_note', 'web']),
  senderId: z.string(),
  senderName: z.string().optional(),
  text: z.string(),
  audioUrl: z.string().optional(),
  timestamp: z.string().optional()
});
export type OmnichannelMessage = z.infer<typeof OmnichannelMessageSchema>;

export const OmnichannelResponseSchema = z.object({
  channel: z.enum(['telegram', 'whatsapp', 'slack', 'sms', 'voice_note', 'web']),
  recipientId: z.string(),
  replyText: z.string(),
  requiresApproval: z.boolean().default(false),
  planId: z.string().optional(),
  approvalToken: z.string().optional()
});
export type OmnichannelResponse = z.infer<typeof OmnichannelResponseSchema>;

// --- Background Scheduler Configuration ---
export const ScheduledJobConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  cronExpression: z.string(),
  routineType: AssistantRoutineTypeSchema,
  enabled: z.boolean().default(true),
  lastRunAt: z.string().optional(),
  nextRunAt: z.string().optional(),
  notifyChannels: z.array(z.enum(['email', 'telegram', 'slack', 'sms'])).default(['email'])
});
export type ScheduledJobConfig = z.infer<typeof ScheduledJobConfigSchema>;

