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

