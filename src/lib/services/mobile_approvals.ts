/**
 * Mobile Interactive Approval Gate Service.
 * 
 * Replaces human assistant remote delegation:
 * - Issues secure mobile authorization tokens when consequential actions pause for confirmation
 * - Processes remote approvals dispatched via Telegram buttons, Slack actions, or mobile push links
 * - Resumes the paused execution engine once human consent is authoritative
 */

import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { ExecutionSummary, TaskPlan } from '@/types';

export class MobileApprovalService {
  /**
   * Evaluates a mobile approval callback (Approve / Reject) and resumes plan execution.
   */
  public static async processMobileDecision(token: string, approved: boolean): Promise<{
    success: boolean;
    plan: TaskPlan | null;
    summary: ExecutionSummary | null;
    message: string;
  }> {
    const approvalRecord = AppStorage.getMobileApproval(token);
    if (!approvalRecord) {
      return {
        success: false,
        plan: null,
        summary: null,
        message: 'Invalid or expired authorization token.'
      };
    }

    if (approvalRecord.status !== 'pending') {
      return {
        success: false,
        plan: null,
        summary: null,
        message: `This action has already been ${approvalRecord.status}.`
      };
    }

    const plan = AppStorage.getPlan(approvalRecord.planId);
    if (!plan) {
      return {
        success: false,
        plan: null,
        summary: null,
        message: 'Associated task plan could not be located.'
      };
    }

    AppStorage.resolveMobileApproval(token, approved);

    if (!approved) {
      plan.status = 'rejected';
      AppStorage.savePlan(plan);
      return {
        success: true,
        plan,
        summary: null,
        message: 'Action rejected by executive from mobile channel.'
      };
    }

    // Resume execution with user approval granted
    const { plan: resumedPlan, summary } = await WorkflowExecutionEngine.executePlan(plan, true);
    return {
      success: true,
      plan: resumedPlan,
      summary,
      message: 'Action approved and successfully executed by virtual assistant.'
    };
  }
}
