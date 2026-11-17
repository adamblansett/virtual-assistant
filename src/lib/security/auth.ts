/**
 * API & Webhook Authentication Guard.
 * 
 * Enforces constant-time Bearer/API key authentication when ASSISTANT_ACCESS_TOKEN is set,
 * and verifies X-Telegram-Bot-Api-Secret-Token on Telegram webhook payloads.
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

export class SecurityAuth {
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
   * Verifies incoming API requests against ASSISTANT_ACCESS_TOKEN if configured.
   * When ASSISTANT_ACCESS_TOKEN is not set (local dev/test mode), requests are allowed.
   */
  public static verifyApiRequest(req: NextRequest): { authorized: boolean; reason?: string } {
    const expectedToken = this.getExpectedToken();
    if (!expectedToken) {
      return { authorized: true };
    }

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const apiKeyHeader = req.headers.get('x-api-key') || '';
    const cookieToken = req.cookies?.get('va_session')?.value || '';

    const candidate = bearerToken || apiKeyHeader || cookieToken;
    if (!candidate) {
      return { authorized: false, reason: 'Missing authentication credentials (Bearer token, X-API-Key, or session cookie).' };
    }

    if (!this.safeCompare(candidate, expectedToken)) {
      return { authorized: false, reason: 'Invalid authentication credentials.' };
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
}
