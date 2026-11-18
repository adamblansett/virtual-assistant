/**
 * Outbound Event Webhook Bus Service.
 *
 * Dispatches HMAC-SHA256 signed lifecycle events (`plan.succeeded`, `approval.requested`,
 * `routine.completed`, `conflict.detected`, `expense.reconciled`) to external automation
 * pipelines (n8n, Zapier, Make, Home Assistant, or custom enterprise webhooks).
 */

import crypto from 'crypto';

export type AssistantWebhookEventType =
  | 'plan.succeeded'
  | 'approval.requested'
  | 'routine.completed'
  | 'conflict.detected'
  | 'expense.reconciled'
  | '*';

export interface OutboundWebhookSubscription {
  id: string;
  name: string;
  targetUrl: string;
  events: AssistantWebhookEventType[];
  secret?: string;
  enabled: boolean;
  createdAt: string;
}

export interface OutboundWebhookDeliveryRecord {
  id: string;
  subscriptionId: string;
  targetUrl: string;
  eventType: string;
  status: 'delivered' | 'simulated' | 'failed';
  statusCode?: number;
  signature?: string;
  timestamp: string;
  payloadPreview: string;
}

export class OutboundWebhookBus {
  private static subscriptions: Map<string, OutboundWebhookSubscription> = new Map();
  private static deliveryLog: OutboundWebhookDeliveryRecord[] = [];

  public static listSubscriptions(): OutboundWebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public static getDeliveryLog(): OutboundWebhookDeliveryRecord[] {
    return [...this.deliveryLog];
  }

  public static registerSubscription(input: {
    id?: string;
    name: string;
    targetUrl: string;
    events?: AssistantWebhookEventType[];
    secret?: string;
    enabled?: boolean;
  }): OutboundWebhookSubscription {
    const id = input.id || `wh_sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sub: OutboundWebhookSubscription = {
      id,
      name: input.name,
      targetUrl: input.targetUrl,
      events: input.events && input.events.length > 0 ? input.events : ['*'],
      secret: input.secret,
      enabled: input.enabled ?? true,
      createdAt: new Date().toISOString()
    };
    this.subscriptions.set(id, sub);
    return sub;
  }

  public static deleteSubscription(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  public static computeSignature(payloadJson: string, secret: string): string {
    return (
      'sha256=' + crypto.createHmac('sha256', secret).update(payloadJson, 'utf8').digest('hex')
    );
  }

  /**
   * Emits an event to all matching enabled outbound webhook subscriptions.
   */
  public static async emitEvent(
    eventType: Exclude<AssistantWebhookEventType, '*'>,
    data: Record<string, any>
  ): Promise<OutboundWebhookDeliveryRecord[]> {
    const matching = Array.from(this.subscriptions.values()).filter(
      sub => sub.enabled && (sub.events.includes('*') || sub.events.includes(eventType))
    );

    if (matching.length === 0) return [];

    const timestamp = new Date().toISOString();
    const envelope = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      event: eventType,
      timestamp,
      data
    };
    const bodyString = JSON.stringify(envelope);
    const records: OutboundWebhookDeliveryRecord[] = [];

    for (const sub of matching) {
      const secret = sub.secret || process.env.OUTBOUND_WEBHOOK_SECRET;
      const signature = secret ? this.computeSignature(bodyString, secret) : undefined;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Assistant-Event': eventType,
        'X-Assistant-Timestamp': timestamp
      };
      if (signature) {
        headers['X-Assistant-Signature-256'] = signature;
      }

      let status: OutboundWebhookDeliveryRecord['status'] = 'simulated';
      let statusCode: number | undefined;

      try {
        const res = await fetch(sub.targetUrl, {
          method: 'POST',
          headers,
          body: bodyString,
          signal: AbortSignal.timeout(3000)
        });
        statusCode = res.status;
        status = res.ok ? 'delivered' : 'failed';
      } catch {
        status = 'simulated';
      }

      const record: OutboundWebhookDeliveryRecord = {
        id: `dlv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        subscriptionId: sub.id,
        targetUrl: sub.targetUrl,
        eventType,
        status,
        statusCode,
        signature,
        timestamp,
        payloadPreview: bodyString.slice(0, 200)
      };

      this.deliveryLog.unshift(record);
      if (this.deliveryLog.length > 100) {
        this.deliveryLog.pop();
      }
      records.push(record);
    }

    return records;
  }

  public static clear(): void {
    this.subscriptions.clear();
    this.deliveryLog = [];
  }
}
