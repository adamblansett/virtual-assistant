# Security Policy

## Core Security Architecture

The Open-Source AI Virtual Assistant is architected with a **Defense-in-Depth** security model:

1. **AI Model Isolation**: The AI model is strictly an advisory planner. It cannot execute code or directly invoke system APIs. All operations are mediated and validated by trusted backend application code.
2. **Central Permission Engine**: Tools are categorized into risk tiers (`read`, `reversible_write`, `consequential`, `high_risk`). Server-side policy controls require explicit user authorization for bulk operations and consequential actions (such as sending emails).
3. **Prompt Injection Defense**: External inputs (such as email bodies, subjects, sender headers) are treated as untrusted data. They are wrapped in `<UNTRUSTED_DATA>` security boundary tags, sanitized, and stripped of adversarial injection patterns.
4. **Authoritative State Verification**: The assistant never assumes an operation succeeded based solely on an optimistic API response. The state is authoritatively checked against provider records.
5. **Secret Redaction**: Passwords, OAuth tokens, Authorization bearer headers, and API keys are automatically redacted from all audit logs and user-facing views.
6. **Idempotency Safeguards**: Consequential actions generate deterministic idempotency keys to prevent duplicate execution during network retries or worker restarts.
7. **AES-256-GCM Credential Encryption at Rest (`CryptoVault`)**: API keys (`geminiApiKey`, `openaiApiKey`, `telegramBotToken`, `openWeightApiKey`) and OAuth 2.0 tokens (`accessToken`, `refreshToken`) stored in `data/app_state.json` are encrypted at rest using AES-256-GCM with `crypto.scryptSync` key derivation and written via atomic temp-file replacement (`0o600` permissions).
8. **Constant-Time API, Session Cookie & Webhook Authentication (`SecurityAuth` & `/api/auth/session`)**: Enforces `crypto.timingSafeEqual` verification for API Bearer tokens (`ASSISTANT_ACCESS_TOKEN`), `HttpOnly` web session cookies (`va_session` with an Executive Vault Lock Screen UI), and Telegram webhook secret headers (`X-Telegram-Bot-Api-Secret-Token` / `TELEGRAM_WEBHOOK_SECRET`).
9. **SSRF Protection on Web Research (`WebResearchService`)**: Validates all outbound URLs before fetching, blocking non-HTTP(S) protocols, loopback interfaces (`localhost`, `127.0.0.0/8`, `::1`), private RFC-1918 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata endpoints (`169.254.169.254`).
10. **Strict Zod Schema Validation on Inline Approval Edits**: Any user-edited action parameters (`modifiedArguments`) submitted at the approval gate are strictly validated through the tool's registered Zod schema (`ToolRegistry.getTool(toolName).schema.parse(...)`) prior to execution.
11. **Wire-Level Secret Masking & Sliding-Window Rate Limiting (`SecurityAuth`)**: `GET /api/integrations` masks all configured API keys (`••••••••abcd`) so raw secrets are never sent to browser clients, `AppStorage.updateIntegrationConfig` ignores masked placeholders on update, and `SecurityAuth.checkRateLimit` enforces per-client sliding-window request rate limits.
12. **Slack & WhatsApp HMAC-SHA256 Webhook Verification & MCP Risk Tiering**: Verifies Slack `x-slack-signature` (`v0:timestamp:body` with `SLACK_SIGNING_SECRET`) and Meta WhatsApp `x-hub-signature-256` (`WHATSAPP_APP_SECRET`) using constant-time comparison, and automatically classifies dynamically discovered MCP tools into `read`, `reversible_write`, and `consequential` approval tiers.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please do NOT file a public issue. Instead, report it privately to the maintainers:

- **Email**: `security@open-assistant.dev` (or via private GitHub Vulnerability Reporting)
- Please include steps to reproduce, affected versions, and potential impact.
- Maintainers will acknowledge receipt within 48 hours and provide a timeline for remediation.
