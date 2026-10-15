/**
 * Audit Logger with automatic secret redaction.
 * Tracks every authorization decision, tool execution, and verification outcome.
 */

import { AuditEvent, ActionRiskLevel, ActionExecutionStatus, VerificationStatus } from '@/types';
import { SecretRedactor } from '@/lib/security/crypto';

export class AuditLogger {
  private static events: AuditEvent[] = [];

  public static logEvent(params: {
    userId?: string;
    actionId: string;
    integration: string;
    toolName: string;
    riskLevel: ActionRiskLevel;
    approvedBy: string;
    parameters: Record<string, any>;
    executionStatus: ActionExecutionStatus;
    verificationStatus: VerificationStatus;
    error?: string;
    durationMs?: number;
  }): AuditEvent {
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId || 'default_user',
      actionId: params.actionId,
      integration: params.integration,
      toolName: params.toolName,
      riskLevel: params.riskLevel,
      approvedBy: params.approvedBy,
      parametersRedacted: SecretRedactor.redact(params.parameters || {}),
      executionStatus: params.executionStatus,
      verificationStatus: params.verificationStatus,
      error: params.error,
      durationMs: params.durationMs
    };

    this.events.unshift(event);
    // Keep bounded in-memory buffer
    if (this.events.length > 500) {
      this.events = this.events.slice(0, 500);
    }

    return event;
  }

  public static getEvents(limit: number = 50): AuditEvent[] {
    return this.events.slice(0, limit);
  }

  public static clear(): void {
    this.events = [];
  }
}
