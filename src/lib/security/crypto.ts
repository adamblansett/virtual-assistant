/**
 * Cryptographic utilities and secret redaction.
 * Ensures credentials, tokens, and authorization headers never leak into logs or LLM context.
 */

export class SecretRedactor {
  private static readonly SENSITIVE_KEYS = [
    'authorization',
    'bearer',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'apikey',
    'client_secret',
    'password',
    'secret',
    'credentials'
  ];

  /**
   * Recursively redacts sensitive keys from objects before logging or auditing.
   */
  public static redact(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      // Redact potential bearer tokens or API key strings
      if (/bearer\s+[a-zA-Z0-9_\-\.]+/i.test(obj)) {
        return obj.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redact(item));
    }

    if (typeof obj === 'object') {
      const cleaned: Record<string, any> = {};
      for (const [key, val] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (this.SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
          cleaned[key] = '[REDACTED]';
        } else {
          cleaned[key] = this.redact(val);
        }
      }
      return cleaned;
    }

    return obj;
  }
}
