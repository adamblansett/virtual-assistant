/**
 * API & Webhook Authentication Guard, Rate Limiter & Secret Masking Utility.
 * 
 * Enforces:
 * - Constant-time Bearer/API key/session cookie authentication when ASSISTANT_ACCESS_TOKEN is set
 * - Sliding-window per-client API rate limiting
 * - Secret masking for API keys sent over the wire
 * - Constant-time X-Telegram-Bot-Api-Secret-Token verification on Telegram webhook payloads
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

export class SecurityAuth {
  private static rateBuckets: Map<string, number[]> = new Map();

  private static safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  public static getExpectedToken(): string | undefined {
    return (
      process.env.ASSISTANT_ACCESS_TOKEN ||
      process.env.ASSISTANT_API_TOKEN ||
      process.env.ASSISTANT_API_SECRET ||
      undefined
    );
  }

  public static verifyTokenValue(candidate: string): boolean {
    const expected = this.getExpectedToken();
    if (!expected) return true;
    if (!candidate) return false;
    return this.safeCompare(candidate, expected);
  }

  /**
   * Sliding-window rate limiter (default 120 requests per 60 seconds per client identifier).
   */
  public static checkRateLimit(
    clientKey: string,
    limitPerMinute: number = 120,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetInMs: number } {
    const now = Date.now();
    const cutoff = now - windowMs;
    const existing = (this.rateBuckets.get(clientKey) || []).filter(ts => ts > cutoff);

    if (existing.length >= limitPerMinute) {
      const oldest = existing[0] || now;
      return {
        allowed: false,
        remaining: 0,
        resetInMs: Math.max(0, oldest + windowMs - now)
      };
    }

    existing.push(now);
    this.rateBuckets.set(clientKey, existing);

    return {
      allowed: true,
      remaining: Math.max(0, limitPerMinute - existing.length),
      resetInMs: windowMs
    };
  }

  public static resetRateLimits(): void {
    this.rateBuckets.clear();
  }

  /**
   * Masks a secret string for safe transmission to the frontend UI (e.g. "••••••••a1b2").
   */
  public static maskSecret(secret?: string): string | undefined {
    if (!secret || !secret.trim()) return undefined;
    if (secret.startsWith('••••')) return secret;
    if (secret.length <= 6) return '••••••••';
    return `••••••••${secret.slice(-4)}`;
  }

  public static isMaskedSecret(val?: string): boolean {
    return Boolean(val && val.startsWith('••••'));
  }

  /**
   * Returns a shallow copy of integrationConfig with sensitive API keys masked for HTTP responses.
   */
  public static maskIntegrationConfig<T extends Record<string, any>>(config: T): T & {
    hasGeminiKey: boolean;
    hasOpenaiKey: boolean;
    hasTelegramToken: boolean;
    hasOpenWeightKey: boolean;
  } {
    return {
      ...config,
      geminiApiKey: this.maskSecret(config.geminiApiKey),
      openaiApiKey: this.maskSecret(config.openaiApiKey),
      telegramBotToken: this.maskSecret(config.telegramBotToken),
      openWeightApiKey: this.maskSecret(config.openWeightApiKey),
      hasGeminiKey: Boolean(config.geminiApiKey && !this.isMaskedSecret(config.geminiApiKey)),
      hasOpenaiKey: Boolean(config.openaiApiKey && !this.isMaskedSecret(config.openaiApiKey)),
      hasTelegramToken: Boolean(config.telegramBotToken && !this.isMaskedSecret(config.telegramBotToken)),
      hasOpenWeightKey: Boolean(config.openWeightApiKey && !this.isMaskedSecret(config.openWeightApiKey))
    };
  }

  /**
   * Verifies incoming API requests against ASSISTANT_ACCESS_TOKEN if configured.
   * When ASSISTANT_ACCESS_TOKEN is not set (local dev/test mode), requests are allowed.
   */
  public static verifyApiRequest(req?: NextRequest): { authorized: boolean; status?: number; reason?: string } {
    if (req) {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'local';
      const limit = Number(process.env.ASSISTANT_RATE_LIMIT_PER_MIN || 180);
      const rate = this.checkRateLimit(ip, limit);
      if (!rate.allowed) {
        return {
          authorized: false,
          status: 429,
          reason: 'Rate limit exceeded. Please wait before sending more requests.'
        };
      }
    }

    const expectedToken = this.getExpectedToken();
    if (!expectedToken) {
      return { authorized: true };
    }

    if (!req) {
      return { authorized: false, status: 401, reason: 'Missing authentication request context.' };
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const apiKeyHeader = req.headers.get('x-api-key') || '';
    const cookieToken = req.cookies?.get('va_session')?.value || '';

    const candidate = bearerToken || apiKeyHeader || cookieToken;
    if (!candidate) {
      return {
        authorized: false,
        status: 401,
        reason: 'Missing authentication credentials (Bearer token, X-API-Key, or session cookie).'
      };
    }

    if (!this.safeCompare(candidate, expectedToken)) {
      return {
        authorized: false,
        status: 401,
        reason: 'Invalid authentication credentials.'
      };
    }

    return { authorized: true };
  }

  /**
   * Verifies Telegram webhook requests against TELEGRAM_WEBHOOK_SECRET if configured.
   */
  public static verifyTelegramWebhook(req: NextRequest): { authorized: boolean; reason?: string } {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expectedSecret) {
      return { authorized: true };
    }

    const receivedSecret = req.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!receivedSecret || !this.safeCompare(receivedSecret, expectedSecret)) {
      return { authorized: false, reason: 'Invalid or missing X-Telegram-Bot-Api-Secret-Token header.' };
    }

    return { authorized: true };
  }

  /**
   * Verifies Slack webhook requests against SLACK_SIGNING_SECRET using v0:timestamp:body HMAC-SHA256.
   */
  public static verifySlackWebhook(
    req: NextRequest,
    rawBody: string
  ): { authorized: boolean; reason?: string } {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      return { authorized: true };
    }

    const timestamp = req.headers.get('x-slack-request-timestamp') || '';
    const signature = req.headers.get('x-slack-signature') || '';
    if (!timestamp || !signature) {
      return { authorized: false, reason: 'Missing Slack signature or timestamp headers.' };
    }

    const baseString = `v0:${timestamp}:${rawBody}`;
    const expectedSig =
      'v0=' + crypto.createHmac('sha256', signingSecret).update(baseString, 'utf8').digest('hex');

    if (!this.safeCompare(signature, expectedSig)) {
      return { authorized: false, reason: 'Invalid Slack HMAC-SHA256 signature.' };
    }

    return { authorized: true };
  }

  /**
   * Verifies Meta WhatsApp Cloud API webhook payloads against WHATSAPP_APP_SECRET using x-hub-signature-256.
   */
  public static verifyWhatsAppWebhook(
    req: NextRequest,
    rawBody: string
  ): { authorized: boolean; reason?: string } {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      return { authorized: true };
    }

    const signature = req.headers.get('x-hub-signature-256') || '';
    if (!signature) {
      return { authorized: false, reason: 'Missing X-Hub-Signature-256 header.' };
    }

    const expectedSig =
      'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');

    if (!this.safeCompare(signature, expectedSig)) {
      return { authorized: false, reason: 'Invalid WhatsApp X-Hub-Signature-256.' };
    }

    return { authorized: true };
  }
}
