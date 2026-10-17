/**
 * Task Planner.
 * Converts natural-language requests into structured, inspectable multi-step execution plans.
 * Explicitly separates planning from execution.
 */

import { TaskPlan, PlannedAction, UserPreferences } from '@/types';
import { IAIProviderAdapter, AIMessage } from '@/lib/ai/types';
import { ToolRegistry } from '@/lib/tools/registry';
import { PolicyEngine } from '@/lib/policy/engine';
import { SecuritySanitizer } from '@/lib/security/sanitizer';
import { MemoryService } from '@/lib/services/memory';
import { AppStorage } from '@/lib/storage/db';

export class TaskPlanner {
  constructor(
    private aiProvider: IAIProviderAdapter,
    private preferences: UserPreferences
  ) {}

  public async createPlan(userPrompt: string): Promise<TaskPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sanitizedPrompt = SecuritySanitizer.sanitizeString(userPrompt);
    const lower = sanitizedPrompt.toLowerCase();

    // Check for explicit multi-step intent patterns (e.g. Email Cleanup)
    if (lower.includes('clean') && (lower.includes('older than') || lower.includes('5 year') || lower.includes('five year'))) {
      return this.buildEmailCleanupPlan(planId, sanitizedPrompt);
    }

    if (lower.includes('send') && lower.includes('email to')) {
      return this.buildSendEmailPlan(planId, sanitizedPrompt);
    }

    // Default conversational / tool-calling path via AI Provider with full JSON Schema parameters
    const tools = ToolRegistry.listTools().map(t => ({
      name: t.name,
      description: t.description,
      parameters: ToolRegistry.getToolJsonSchema(t)
    }));

    const memoryContext = MemoryService.formatMemoriesForPrompt();
    const recentHistory = AppStorage.getConversationHistory()
      .slice(-6)
      .filter(m => m.text !== sanitizedPrompt)
      .map<AIMessage>(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text
      }));

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are an AI Virtual Assistant. Generate structured action plans using available tools. Never bypass permissions.\n\n${memoryContext}`
      },
      ...recentHistory,
      {
        role: 'user',
        content: sanitizedPrompt
      }
    ];

    const aiRes = await this.aiProvider.generateCompletion(messages, tools);

    const plannedActions: PlannedAction[] = [];

    if (aiRes.toolCalls && aiRes.toolCalls.length > 0) {
      for (const tc of aiRes.toolCalls) {
        const toolDef = ToolRegistry.getTool(tc.name);
        if (!toolDef) continue;

        const action: PlannedAction = {
          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          integration: toolDef.integration,
          toolName: tc.name,
          arguments: tc.arguments,
          requiredPermission: toolDef.requiredPermission,
          targetResource: `integration:${toolDef.integration}`,
          expectedOutcome: `Execute ${tc.name} with validated parameters.`,
          riskLevel: toolDef.riskLevel,
          approvalRequired: toolDef.approvalRequiredByDefault,
          status: 'proposed',
          verificationStatus: 'pending',
          retryCount: 0
        };

        const policy = PolicyEngine.evaluateAction(action, this.preferences);
        action.approvalRequired = policy.requiresApproval;

        plannedActions.push(action);
      }
    }

    const requiresConfirmation = plannedActions.some(a => a.approvalRequired);

    return {
      id: planId,
      userRequestId: `req_${Date.now()}`,
      originalPrompt: sanitizedPrompt,
      summary: aiRes.text || 'Executing requested task.',
      status: requiresConfirmation ? 'awaiting_approval' : 'proposed',
      actions: plannedActions,
      requiresUserConfirmation: requiresConfirmation,
      confirmationPrompt: requiresConfirmation
        ? 'One or more planned actions require explicit confirmation before execution.'
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Builds the canonical Email Cleanup Plan.
   * Step 1: Preview & scope determination (filter out tax/starred/receipts).
   * Step 2: Trash approved messages (requires confirmation).
   * Step 3: Verify trash state on provider.
   */
  private buildEmailCleanupPlan(planId: string, prompt: string): TaskPlan {
    const previewAction: PlannedAction = {
      id: `act_${planId}_preview`,
      integration: 'gmail',
      toolName: 'gmail_preview_cleanup',
      arguments: { olderThanYears: 5 },
      requiredPermission: 'gmail.readonly',
      targetResource: 'gmail:messages',
      expectedOutcome: 'Search emails older than 5 years, calculate total volume, and exclude protected categories (tax, legal, receipts, starred).',
      riskLevel: 'read',
      approvalRequired: false,
      status: 'proposed',
      verificationStatus: 'not_applicable',
      retryCount: 0
    };

    const trashAction: PlannedAction = {
      id: `act_${planId}_trash`,
      integration: 'gmail',
      toolName: 'gmail_trash_messages',
      arguments: { messageIds: [] }, // Populated after preview step
      requiredPermission: 'gmail.modify',
      targetResource: 'gmail:messages',
      expectedOutcome: 'Move approved qualifying non-protected messages to Trash.',
      riskLevel: 'reversible_write',
      approvalRequired: true,
      status: 'awaiting_approval',
      verificationStatus: 'pending',
      retryCount: 0
    };

    const verifyAction: PlannedAction = {
      id: `act_${planId}_verify`,
      integration: 'gmail',
      toolName: 'gmail_verify_trash_state',
      arguments: { messageIds: [], expectedLabel: 'TRASH' },
      requiredPermission: 'gmail.readonly',
      targetResource: 'gmail:messages',
      expectedOutcome: 'Verify that approved messages now possess the TRASH label in Gmail.',
      riskLevel: 'read',
      approvalRequired: false,
      status: 'proposed',
      verificationStatus: 'pending',
      retryCount: 0
    };

    return {
      id: planId,
      userRequestId: `req_${Date.now()}`,
      originalPrompt: prompt,
      summary: 'Find emails older than 5 years, preserve protected categories (tax, financial, starred), preview candidate count, and request authorization before moving to Trash.',
      status: 'awaiting_approval',
      actions: [previewAction, trashAction, verifyAction],
      requiresUserConfirmation: true,
      confirmationPrompt: 'Bulk email cleanup will move qualifying messages older than 5 years to Trash (excluding protected receipts, tax, and starred messages). Do you authorize this action?',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private buildSendEmailPlan(planId: string, prompt: string): TaskPlan {
    const sendAction: PlannedAction = {
      id: `act_${planId}_send`,
      integration: 'gmail',
      toolName: 'gmail_send_message',
      arguments: {
        to: 'recipient@example.com',
        subject: 'Message from AI Assistant',
        body: 'Here is the authorized content.'
      },
      requiredPermission: 'gmail.send',
      targetResource: 'gmail:messages:send',
      expectedOutcome: 'Send email to specified recipient.',
      riskLevel: 'consequential',
      approvalRequired: true,
      status: 'awaiting_approval',
      verificationStatus: 'not_applicable',
      retryCount: 0
    };

    return {
      id: planId,
      userRequestId: `req_${Date.now()}`,
      originalPrompt: prompt,
      summary: 'Send email to recipient with explicit user confirmation.',
      status: 'awaiting_approval',
      actions: [sendAction],
      requiresUserConfirmation: true,
      confirmationPrompt: 'Sending an email is a consequential external action. Please review recipient and body before confirming.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}
