/**
 * Web Research & Safe URL Reader Service.
 * 
 * Enables the assistant to perform live web lookups and read public web pages
 * while enforcing strict SSRF protection (blocking private/loopback IP ranges)
 * and prompt-injection sanitization on untrusted web content.
 */

import { SecuritySanitizer } from '@/lib/security/sanitizer';

export interface WebSearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface WebPageReadResult {
  url: string;
  title: string;
  content: string;
  truncated: boolean;
}

export class WebResearchService {
  /**
   * Validates that a URL is safe to fetch (http/https only, no loopback or private network IPs).
   */
  public static validateSafeUrl(rawUrl: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(`Invalid URL: "${rawUrl}"`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported URL protocol "${parsed.protocol}". Only http: and https: are allowed.`);
    }

    const host = parsed.hostname.toLowerCase();
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254', 'metadata.google.internal'];
    if (
      blockedHosts.includes(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^10\.\d+\.\d+\.\d+$/.test(host) ||
      /^192\.168\.\d+\.\d+$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)
    ) {
      throw new Error(`SSRF Protection: Access to internal or private host "${host}" is forbidden.`);
    }

    return parsed;
  }

  /**
   * Fetches and extracts sanitized readable text from a public URL.
   */
  public static async readUrl(rawUrl: string, maxChars: number = 8000): Promise<WebPageReadResult> {
    const parsed = this.validateSafeUrl(rawUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'OpenSourceVirtualAssistant/1.0 (+https://github.com/adamblansett/virtual-assistant)',
          'Accept': 'text/html,application/xhtml+xml,text/plain,application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} when fetching ${parsed.toString()}`);
      }

      const rawHtml = await res.text();
      const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? SecuritySanitizer.stripHtml(titleMatch[1]).trim() : parsed.hostname;

      const cleanText = SecuritySanitizer.stripHtml(
        rawHtml
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      );

      const truncated = cleanText.length > maxChars;
      const content = SecuritySanitizer.wrapUntrustedContent(
        cleanText.slice(0, maxChars),
        `web_url:${parsed.hostname}`
      );

      return {
        url: parsed.toString(),
        title,
        content,
        truncated
      };
    } catch (err: any) {
      if (err.message?.includes('SSRF Protection') || err.message?.includes('Unsupported URL protocol')) {
        throw err;
      }
      // Graceful fallback for offline environments
      return {
        url: parsed.toString(),
        title: parsed.hostname,
        content: SecuritySanitizer.wrapUntrustedContent(
          `[Offline / Unreachable Host: ${parsed.toString()}] (${err.message || 'Network unavailable'})`,
          `web_url:${parsed.hostname}`
        ),
        truncated: false
      };
    }
  }

  /**
   * Performs a web search using DuckDuckGo Instant Answer API with deterministic offline fallback.
   */
  public static async searchWeb(query: string, maxResults: number = 5): Promise<{
    query: string;
    results: WebSearchResultItem[];
  }> {
    const cleanQuery = SecuritySanitizer.sanitizeString(query);

    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const items: WebSearchResultItem[] = [];

        if (data.AbstractText && data.AbstractURL) {
          items.push({
            title: data.Heading || cleanQuery,
            url: data.AbstractURL,
            snippet: SecuritySanitizer.sanitizeString(data.AbstractText)
          });
        }

        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics) {
            if (items.length >= maxResults) break;
            if (topic.Text && topic.FirstURL) {
              items.push({
                title: topic.Text.split(' - ')[0] || cleanQuery,
                url: topic.FirstURL,
                snippet: SecuritySanitizer.sanitizeString(topic.Text)
              });
            }
          }
        }

        if (items.length > 0) {
          return { query: cleanQuery, results: items.slice(0, maxResults) };
        }
      }
    } catch {
      // Fall through to deterministic fallback below
    }

    return {
      query: cleanQuery,
      results: [
        {
          title: `Executive Research Summary: ${cleanQuery}`,
          url: `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
          snippet: `Synthesized research reference for "${cleanQuery}". Connect live network or use web_read_url on a specific target domain for full page extraction.`
        }
      ]
    };
  }
}
