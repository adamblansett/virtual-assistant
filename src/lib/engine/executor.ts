/**
 * Workflow Execution Engine.
 * 
 * Orchestrates the full lifecycle:
 * Plan -> Validate -> Authorize -> Execute -> Verify -> Audit -> Report
 * 
 * Guarantees that AI models cannot bypass permissions or execute unauthorized actions.
 */

import { TaskPlan, ExecutionSummary, UserPreferences } from '@/types';
import { PolicyEngine } from '@/lib/policy/engine';
import { ToolRegistry } from '@/lib/tools/registry';
import { ResultVerifier } from '@/lib/verification/verifier';
import { AuditLogger } from '@/lib/audit/logger';
import { IdempotencyManager } from '@/lib/engine/idempotency';
import { AppStorage } from '@/lib/storage/db';
import { MockGmailAdapter } from '@/lib/integrations/gmail/mock';
import { GmailService } from '@/lib/integrations/gmail/service';

import { MockCalendarAdapter } from '@/lib/integrations/calendar/mock';
import { SandboxedFileService } from '@/lib/integrations/files/service';
import { InitializedAdaptersBundle } from '@/lib/tools/registry';

export class WorkflowExecutionEngine {
  private static defaultMockGmail = new MockGmailAdapter();
  private static defaultCalendar = new MockCalendarAdapter();
  private static defaultFiles = new SandboxedFileService();

  public static reset(): void {
    this.defaultMockGmail = new MockGmailAdapter();
    this.defaultCalendar = new MockCalendarAdapter();
    this.defaultFiles = new SandboxedFileService();
    IdempotencyManager.clear();
  }

  public static getGmailAdapter(): MockGmailAdapter | GmailService {
    const config = AppStorage.getIntegrationConfig();
    if (config.useMockGmail) {
      return this.defaultMockGmail;
    }
    return new GmailService();
  }

  public static getAdaptersBundle(): InitializedAdaptersBundle {
    return {
      gmail: this.getGmailAdapter(),
      calendar: this.defaultCalendar,
      files: this.defaultFiles
    };
  }

  /**
   * Executes a TaskPlan through all safety and authorization gates.
   * If an action requires human approval and has not been approved, execution pauses in 'awaiting_approval'.
   */
  public static async executePlan(
    plan: TaskPlan,
    isUserApproved: boolean = false,
    approvedActionIds: string[] = []
  ): Promise<{ plan: TaskPlan; summary: ExecutionSummary }> {
    const preferences: UserPreferences = AppStorage.getPreferences();
    const adapters = this.getAdaptersBundle();

    let succeeded = 0;
    let partiallySucceeded = 0;
    let failed = 0;
    const skipped = 0;
    let verified = 0;
    let verificationFailed = 0;

    // Check if initial plan needs approval
    let pausedForApproval = false;

    // Intermediate state passed between sequential actions (e.g. preview qualifyingIds -> trash action)
    const dynamicContext: Record<string, any> = {};

    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];

      // If action was already succeeded, continue
      if (action.status === 'succeeded') {
        succeeded++;
        if (action.verificationStatus === 'verified') verified++;
        continue;
      }

      // Check user approval grant for this specific action
      const hasSpecificApproval = isUserApproved || approvedActionIds.includes(action.id);

      // Evaluate server-side policy
      const policy = PolicyEngine.evaluateAction(action, preferences, hasSpecificApproval);

      if (!policy.allowed) {
        if (policy.requiresApproval) {
          action.status = 'awaiting_approval';
          plan.status = 'awaiting_approval';
          plan.requiresUserConfirmation = true;
          plan.confirmationPrompt = policy.reason;
          pausedForApproval = true;
          break; // Pause execution and wait for human confirmation
        } else {
          action.status = 'failed';
          action.error = policy.reason;
          failed++;
          AuditLogger.logEvent({
            actionId: action.id,
            integration: action.integration,
            toolName: action.toolName,
            riskLevel: action.riskLevel,
            approvedBy: 'system_policy_denial',
            parameters: action.arguments,
            executionStatus: 'failed',
            verificationStatus: 'not_applicable',
            error: policy.reason
          });
          continue;
        }
      }

      // Inject dynamically resolved arguments from prior steps if needed
      if (action.toolName === 'gmail_trash_messages' && dynamicContext.qualifyingIds) {
        action.arguments = {
          ...action.arguments,
          messageIds: dynamicContext.qualifyingIds
        };
      }
      if (action.toolName === 'gmail_verify_trash_state' && dynamicContext.qualifyingIds) {
        action.arguments = {
          ...action.arguments,
          messageIds: dynamicContext.qualifyingIds
        };
      }

      // Idempotency check for consequential or write actions
      const idempotencyKey = IdempotencyManager.generateKey(action.toolName, action.arguments);
      action.idempotencyKey = idempotencyKey;

      const idempotencyState = IdempotencyManager.checkKey(idempotencyKey);
      if (idempotencyState && idempotencyState.status === 'completed') {
        action.status = 'succeeded';
        action.result = idempotencyState.result;
        succeeded++;
        continue;
      }

      // Transition to running
      action.status = 'running';
      plan.status = 'running';
      AppStorage.savePlan(plan);

      const startTime = Date.now();
      IdempotencyManager.startAction(idempotencyKey, action.id);

      try {
        // Execute tool
        const toolResult = await ToolRegistry.executeTool(
          action.toolName,
          action.arguments,
          adapters,
          preferences
        );

        action.result = toolResult;
        const durationMs = Date.now() - startTime;

        // If preview step, save qualifying IDs into dynamic context and update downstream actions
        if (action.toolName === 'gmail_preview_cleanup') {
          dynamicContext.qualifyingIds = toolResult.qualifyingIds || [];
          plan.affectedResourcePreview = {
            count: toolResult.qualifyingCount || 0,
            description: `${toolResult.qualifyingCount} qualifying emails older than 5 years (excluding ${toolResult.protectedCount} protected emails).`,
            sampleItems: toolResult.qualifyingSample || []
          };

          // Populate downstream actions with resolved message IDs so they persist across approval sessions
          for (let j = i + 1; j < plan.actions.length; j++) {
            const nextAct = plan.actions[j];
            if (nextAct.toolName === 'gmail_trash_messages' || nextAct.toolName === 'gmail_verify_trash_state') {
              nextAct.arguments = {
                ...nextAct.arguments,
                messageIds: toolResult.qualifyingIds || []
              };
            }
          }
        }

        // Authoritative verification
        const verification = await ResultVerifier.verifyAction(action, adapters);
        action.verificationStatus = verification.verified ? 'verified' : 'failed';
        action.verificationDetails = verification.details.join('; ');

        if (verification.verified) {
          verified++;
        } else {
          verificationFailed++;
        }

        // Check partial vs full success for batch operations
        if (toolResult && typeof toolResult.failedCount === 'number' && toolResult.failedCount > 0) {
          action.status = toolResult.succeededCount > 0 ? 'partially_succeeded' : 'failed';
          if (action.status === 'partially_succeeded') partiallySucceeded++;
          else failed++;
        } else {
          action.status = 'succeeded';
          succeeded++;
        }

        IdempotencyManager.recordSuccess(idempotencyKey, toolResult);

        AuditLogger.logEvent({
          actionId: action.id,
          integration: action.integration,
          toolName: action.toolName,
          riskLevel: action.riskLevel,
          approvedBy: hasSpecificApproval ? 'user_interactive' : 'policy_auto_read',
          parameters: action.arguments,
          executionStatus: action.status,
          verificationStatus: action.verificationStatus,
          durationMs
        });

      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        action.status = 'failed';
        action.error = err.message || 'Execution error';
        action.verificationStatus = 'failed';
        failed++;

        IdempotencyManager.recordFailure(idempotencyKey, action.error || 'Failed');

        AuditLogger.logEvent({
          actionId: action.id,
          integration: action.integration,
          toolName: action.toolName,
          riskLevel: action.riskLevel,
          approvedBy: hasSpecificApproval ? 'user_interactive' : 'policy_auto_read',
          parameters: action.arguments,
          executionStatus: 'failed',
          verificationStatus: 'failed',
          error: action.error,
          durationMs
        });

        // Break on failure to preserve partial results safely
        break;
      }
    }

    // Determine final plan status
    if (pausedForApproval) {
      plan.status = 'awaiting_approval';
    } else if (failed > 0 && succeeded === 0) {
      plan.status = 'failed';
    } else if (failed > 0 || partiallySucceeded > 0) {
      plan.status = 'partially_succeeded';
    } else if (succeeded === plan.actions.length) {
      plan.status = 'succeeded';
      plan.requiresUserConfirmation = false;
    } else {
      plan.status = 'running';
    }

    plan.updatedAt = new Date().toISOString();
    AppStorage.savePlan(plan);

    const explanation = this.buildOutcomeExplanation(plan, succeeded, failed, skipped, verified);

    return {
      plan,
      summary: {
        planId: plan.id,
        totalActions: plan.actions.length,
        succeeded,
        partiallySucceeded,
        failed,
        skipped,
        verified,
        verificationFailed,
        explanation
      }
    };
  }

  private static buildOutcomeExplanation(
    plan: TaskPlan,
    succeeded: number,
    failed: number,
    _skipped: number,
    _verified: number
  ): string {
    if (plan.status === 'awaiting_approval') {
      return `Preview completed. Found ${plan.affectedResourcePreview?.count ?? 'qualifying'} emails. Action is paused awaiting your confirmation before moving messages to Trash.`;
    }

    if (plan.status === 'succeeded') {
      return `All ${succeeded} planned actions completed successfully and verified with authoritative provider state.`;
    }

    if (plan.status === 'partially_succeeded') {
      return `Workflow completed partially: ${succeeded} succeeded, ${failed} failed.`;
    }

    return `Workflow execution stopped with ${failed} failures.`;
  }
}
