/**
 * Central Permission & Safety Policy Engine.
 * 
 * Enforces server-side authorization boundaries, risk classification,
 * and mandatory human approval gates before executing real operations.
 */

import { ActionRiskLevel, PlannedAction, UserPreferences } from '@/types';

export interface PolicyEvaluationResult {
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: ActionRiskLevel;
  reason: string;
}

export class PolicyEngine {
  /**
   * Evaluates whether an action is permitted and whether it requires human confirmation.
   */
  public static evaluateAction(
    action: PlannedAction,
    preferences: UserPreferences,
    isExplicitlyApprovedByUser: boolean = false
  ): PolicyEvaluationResult {
    const { toolName, riskLevel, arguments: args } = action;

    // 1. High Risk Check
    if (riskLevel === 'high_risk') {
      return {
        allowed: false,
        requiresApproval: true,
        riskLevel: 'high_risk',
        reason: 'High-risk operations (permanent data deletion, shell access) are disabled by default.'
      };
    }

    // 2. Explicit approval flag check: if action is marked approvalRequired, enforce it
    if (action.approvalRequired && !isExplicitlyApprovedByUser) {
      return {
        allowed: false,
        requiresApproval: true,
        riskLevel: action.riskLevel,
        reason: 'Action requires explicit human confirmation before execution.'
      };
    }

    // 2. Consequential Operations (e.g. sending emails)
    if (riskLevel === 'consequential' || toolName.includes('send')) {
      if (isExplicitlyApprovedByUser) {
        return {
          allowed: true,
          requiresApproval: false,
          riskLevel: 'consequential',
          reason: 'Consequential action explicitly authorized by user.'
        };
      }
      return {
        allowed: false,
        requiresApproval: true,
        riskLevel: 'consequential',
        reason: 'Consequential operations (e.g., sending emails) strictly require explicit human approval.'
      };
    }

    // 3. Reversible Write Operations (e.g. trashing, archiving, labeling)
    if (riskLevel === 'reversible_write') {
      // Check if it affects multiple items (bulk action)
      const itemCount = Array.isArray(args.messageIds) ? args.messageIds.length : (args.count || 1);
      const isBulk = itemCount >= preferences.requireBulkConfirmationThreshold;

      if (isBulk && !isExplicitlyApprovedByUser) {
        return {
          allowed: false,
          requiresApproval: true,
          riskLevel: 'reversible_write',
          reason: `Bulk modification affecting ${itemCount} items requires human confirmation.`
        };
      }

      return {
        allowed: isExplicitlyApprovedByUser || !isBulk,
        requiresApproval: isBulk && !isExplicitlyApprovedByUser,
        riskLevel: 'reversible_write',
        reason: isExplicitlyApprovedByUser ? 'Approved by user.' : 'Single item reversible action.'
      };
    }

    // 4. Read Operations
    if (riskLevel === 'read') {
      const autoApprove = preferences.autoApproveReadOperations;
      return {
        allowed: autoApprove || isExplicitlyApprovedByUser,
        requiresApproval: !autoApprove && !isExplicitlyApprovedByUser,
        riskLevel: 'read',
        reason: autoApprove ? 'Read operations auto-permitted by user preference.' : 'Awaiting read approval.'
      };
    }

    return {
      allowed: false,
      requiresApproval: true,
      riskLevel: 'consequential',
      reason: 'Unknown risk classification. Defaulting to safe rejection.'
    };
  }

  /**
   * Verifies that protected email categories (tax, legal, receipts, starred)
   * are not accidentally included in trash or delete operations.
   */
  public static filterProtectedMessages<T extends { id: string; subject?: string; sender?: string; labelIds?: string[]; date?: string }>(
    messages: T[],
    preferences: UserPreferences
  ): { safeMessages: T[]; protectedMessages: T[] } {
    const safeMessages: T[] = [];
    const protectedMessages: T[] = [];

    const protectedCategories = preferences.protectedEmailCategories.map(c => c.toLowerCase());
    const protectedDomains = preferences.protectedEmailDomains.map(d => d.toLowerCase());

    for (const msg of messages) {
      let isProtected = false;
      const subject = (msg.subject || '').toLowerCase();
      const sender = (msg.sender || '').toLowerCase();
      const labels = (msg.labelIds || []).map(l => l.toLowerCase());

      // Check starred / important
      if (labels.includes('starred') || labels.includes('important')) {
        isProtected = true;
      }

      // Check category keywords in subject
      if (!isProtected && protectedCategories.some(cat => subject.includes(cat))) {
        isProtected = true;
      }

      // Check domain
      if (!isProtected && protectedDomains.some(dom => sender.includes(dom))) {
        isProtected = true;
      }

      if (isProtected) {
        protectedMessages.push(msg);
      } else {
        safeMessages.push(msg);
      }
    }

    return { safeMessages, protectedMessages };
  }
}
