/**
 * Idempotency Protection Manager.
 * Prevents duplicate execution of consequential actions upon retries or worker restarts.
 */

export interface IdempotencyRecord {
  key: string;
  actionId: string;
  status: 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}

export class IdempotencyManager {
  private static store: Map<string, IdempotencyRecord> = new Map();

  public static generateKey(toolName: string, args: Record<string, any>): string {
    const sorted = Object.keys(args).sort().reduce((acc: any, k) => {
      acc[k] = args[k];
      return acc;
    }, {});
    return `${toolName}_${JSON.stringify(sorted)}`;
  }

  public static checkKey(key: string): IdempotencyRecord | undefined {
    return this.store.get(key);
  }

  public static startAction(key: string, actionId: string): boolean {
    const existing = this.store.get(key);
    if (existing && existing.status === 'completed') {
      return false; // Already completed, do not re-execute!
    }
    this.store.set(key, {
      key,
      actionId,
      status: 'in_progress',
      timestamp: Date.now()
    });
    return true;
  }

  public static recordSuccess(key: string, result: any): void {
    const rec = this.store.get(key);
    if (rec) {
      rec.status = 'completed';
      rec.result = result;
    }
  }

  public static recordFailure(key: string, error: string): void {
    const rec = this.store.get(key);
    if (rec) {
      rec.status = 'failed';
      rec.error = error;
    }
  }

  public static clear(): void {
    this.store.clear();
  }
}
