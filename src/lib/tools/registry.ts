/**
 * Central Tool Registry.
 * Defines typed tool schemas, permission requirements, risk levels, and dispatchers.
 */

import { z } from 'zod';
import { ActionRiskLevel } from '@/types';
import { MockGmailAdapter } from '@/lib/integrations/gmail/mock';
import { GmailService } from '@/lib/integrations/gmail/service';
import { PolicyEngine } from '@/lib/policy/engine';
import { UserPreferences } from '@/types';

export interface ToolDefinition {
  name: string;
  integration: string;
  description: string;
  schema: z.ZodObject<any>;
  riskLevel: ActionRiskLevel;
  requiredPermission: string;
  approvalRequiredByDefault: boolean;
}

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

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  static {
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
   * Executes a tool against an integration adapter with argument validation and safety checks.
   */
  public static async executeTool(
    toolName: string,
    rawArgs: Record<string, any>,
    adapter: MockGmailAdapter | GmailService,
    preferences: UserPreferences
  ): Promise<any> {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" is not registered in the system.`);
    }

    // 1. Strict schema validation
    tool.schema.parse(rawArgs);

    // 2. Dispatch with typed schema parsing
    switch (toolName) {
      case 'gmail_search': {
        const args = GmailSearchArgsSchema.parse(rawArgs);
        return adapter.searchMessages(args);
      }

      case 'gmail_preview_cleanup': {
        const args = GmailSearchArgsSchema.parse(rawArgs);
        const searchRes = await adapter.searchMessages(args);
        // Apply protected categories filter
        const { safeMessages, protectedMessages } = PolicyEngine.filterProtectedMessages(
          searchRes.messages,
          preferences
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
        const args = GmailTrashArgsSchema.parse(rawArgs);
        return adapter.trashMessages(args.messageIds);
      }

      case 'gmail_archive_messages': {
        const args = GmailArchiveArgsSchema.parse(rawArgs);
        return adapter.archiveMessages(args.messageIds);
      }

      case 'gmail_apply_label': {
        const args = GmailApplyLabelArgsSchema.parse(rawArgs);
        return adapter.applyLabels(args.messageIds, args.addLabelIds, args.removeLabelIds);
      }

      case 'gmail_create_draft': {
        const args = GmailDraftArgsSchema.parse(rawArgs);
        return adapter.createDraft(args.to, args.subject, args.body);
      }

      case 'gmail_send_message': {
        const args = GmailSendArgsSchema.parse(rawArgs);
        return adapter.sendMessage(args.to, args.subject, args.body);
      }

      case 'gmail_verify_trash_state': {
        const args = GmailVerifyStateArgsSchema.parse(rawArgs);
        const expectedLabel = args.expectedLabel || 'TRASH';
        const verificationResults: Array<{ id: string; verified: boolean; labels: string[] }> = [];

        for (const id of args.messageIds) {
          const detail = await adapter.getMessageDetails(id);
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

      default:
        throw new Error(`Execution handler not implemented for tool: ${toolName}`);
    }
  }
}
