# Security Policy

## Core Security Architecture

The Open-Source AI Virtual Assistant is architected with a **Defense-in-Depth** security model:

1. **AI Model Isolation**: The AI model is strictly an advisory planner. It cannot execute code or directly invoke system APIs. All operations are mediated and validated by trusted backend application code.
2. **Central Permission Engine**: Tools are categorized into risk tiers (`read`, `reversible_write`, `consequential`, `high_risk`). Server-side policy controls require explicit user authorization for bulk operations and consequential actions (such as sending emails).
3. **Prompt Injection Defense**: External inputs (such as email bodies, subjects, sender headers) are treated as untrusted data. They are wrapped in `<UNTRUSTED_DATA>` security boundary tags, sanitized, and stripped of adversarial injection patterns.
4. **Authoritative State Verification**: The assistant never assumes an operation succeeded based solely on an optimistic API response. The state is authoritatively checked against provider records.
5. **Secret Redaction**: Passwords, OAuth tokens, Authorization bearer headers, and API keys are automatically redacted from all audit logs and user-facing views.
6. **Idempotency Safeguards**: Consequential actions generate deterministic idempotency keys to prevent duplicate execution during network retries or worker restarts.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please do NOT file a public issue. Instead, report it privately to the maintainers:

- **Email**: `security@open-assistant.dev` (or via private GitHub Vulnerability Reporting)
- Please include steps to reproduce, affected versions, and potential impact.
- Maintainers will acknowledge receipt within 48 hours and provide a timeline for remediation.
