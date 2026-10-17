/**
 * Security Sanitizer & Prompt Injection Defense.
 * 
 * Enforces strict boundaries between trusted instructions (user/system)
 * and untrusted external data (emails, attachments, webhooks).
 */

export class SecuritySanitizer {
  private static readonly INJECTION_PATTERNS = [
    /ignore\s+((all|previous)\s+)+instructions/i,
    /disregard\s+((all|previous)\s+)+prompts/i,
    /system\s*:\s*/i,
    /assistant\s*:\s*/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /bypass\s+all\s+(security|permission|policy)\s+checks/i,
    /send\s+(all\s+)?(my\s+)?emails\s+to/i,
    /delete\s+all\s+files/i,
    /grant\s+full\s+access/i
  ];

  /**
   * Sanitizes untrusted text and wraps it inside strict, unmistakable data delimiters.
   * Disarms direct injection cues so models treat the content strictly as passive data.
   */
  public static wrapUntrustedData(content: string, source: string = 'external_data'): string {
    if (!content) return '';

    // Check for suspicious injection patterns and disarm them
    let neutralized = content;
    for (const pattern of this.INJECTION_PATTERNS) {
      neutralized = neutralized.replace(pattern, (match) => `[DISARMED_INJECTION: "${match}"]`);
    }

    return `\n<UNTRUSTED_${source.toUpperCase()}>\n${neutralized}\n</UNTRUSTED_${source.toUpperCase()}>\n`;
  }

  /**
   * Checks if a given text payload contains active prompt injection attempts.
   */
  public static containsPromptInjection(content: string): { detected: boolean; patterns: string[] } {
    if (!content) return { detected: false, patterns: [] };

    const detected: string[] = [];
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(content)) {
        detected.push(pattern.source);
      }
    }

    return {
      detected: detected.length > 0,
      patterns: detected
    };
  }

  /**
   * Cleans text to prevent control character exploitation and terminal injection.
   */
  public static sanitizeString(input: string, maxLength: number = 5000): string {
    if (!input) return '';
    return input
      .slice(0, maxLength)
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '');
  }

  /**
   * Strips HTML tags from raw web markup.
   */
  public static stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, ' ');
  }

  /**
   * Alias for wrapUntrustedData for external web and document payloads.
   */
  public static wrapUntrustedContent(content: string, source: string = 'external_data'): string {
    return this.wrapUntrustedData(content, source);
  }
}
