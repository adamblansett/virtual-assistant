# Open-Source AI Virtual Assistant

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/Tests-22%2F22%20Passing-emerald.svg)](tests/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

An **evidence-driven, privacy-first, extensible, self-hostable personal and professional AI Virtual Assistant**.

Unlike conversational chatbots that merely instruct humans on how to perform manual tasks, this virtual assistant understands natural-language requests, synthesizes structured inspectable execution plans, verifies permissions, and executes authorized tasks through real integrations with post-execution state verification.

---

## Key Principles & Architecture

```
                  ┌──────────────────────┐
                  │ User Request (Prompt)│
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ 1. CONVERSATION & AI │
                  │ Intent Interpretation │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ 2. STRUCTURED PLAN   │
                  │ Inspectable Actions  │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ 3. POLICY ENGINE     │
                  │ Risk & Approval Gates│
                  └──────────┬───────────┘
                             │ (Human Authorization)
                             ▼
                  ┌──────────────────────┐
                  │ 4. EXECUTION ENGINE  │
                  │ Idempotency & Tools  │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ 5. STATE VERIFIER    │
                  │ Authoritative Check  │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ 6. REDACTED AUDIT    │
                  │ Immutable Log & PnL  │
                  └──────────────────────┘
```

The system strictly enforces the four-phase separation:
1. **Conversation**: Understanding user intent without granting the model authority to run arbitrary actions.
2. **Planning**: Generating a transparent, inspectable action plan with explicit risk classifications (`read`, `reversible_write`, `consequential`, `high_risk`).
3. **Execution**: Server-side policy checks and human confirmation gates validate permissions and arguments before invoking integration adapters.
4. **Verification**: Authoritative state verification directly against the provider (e.g. checking that messages actually possess the `TRASH` label and lack `INBOX`).

---

## Canonical Vertical Slice: Email Cleanup

### Scenario
**User Request:**
> *"Find emails older than five years that I no longer need and clean them up."*

### System Execution Lifecycle
1. **Connect to Integration**: Connects to the authorized Gmail account (Live OAuth 2.0 or local Mock Sandbox).
2. **Date Boundary & Search**: Queries candidate messages using a strict 5-year chronological cutoff date.
3. **Policy Protection Filtering**: Automatically inspects candidates and excludes protected categories:
   - Tax documents (`@irs.gov`, subjects matching `tax`, `1099`, `w2`)
   - Banking receipts (`@chase.com`, `@bankofamerica.com`, purchase confirmations)
   - Starred & Important messages
4. **Resource Preview**: Displays total found, qualifying candidate count, protected preserved count, and representative sample messages.
5. **Human Approval Gate**: Pauses workflow and presents an interactive authorization control. Bulk destructive or modification actions cannot run without explicit user consent.
6. **Execution**: Moves approved messages to Trash using official API endpoints.
7. **Authoritative Verification**: Re-queries the Gmail API to verify that each target message now has `TRASH` and is removed from `INBOX`.
8. **Accurate Reporting**: Reports exact counts of processed, skipped, protected, and verified items.

---

## Core Capabilities & Current Status

| Capability | Status | Implementation Details |
| :--- | :--- | :--- |
| **Conversational Planner** | :white_check_mark: Verified | Converts natural language into typed `TaskPlan` models |
| **Central Policy Engine** | :white_check_mark: Verified | Server-side risk ratings (`read`, `reversible_write`, `consequential`, `high_risk`) |
| **Approval Gates** | :white_check_mark: Verified | Explicit user confirmation required for bulk modifications & consequential send actions |
| **Protected Categories** | :white_check_mark: Verified | Protects tax, financial, receipts, and starred emails from automatic cleanup |
| **Prompt Injection Defense** | :white_check_mark: Verified | Sanitizes inputs, disarms adversarial phrases, and wraps data in `<UNTRUSTED_DATA>` boundaries |
| **Gmail Mock Sandbox** | :white_check_mark: Verified | Deterministic in-memory adapter pre-seeded with realistic test emails |
| **Gmail Live OAuth 2.0** | :white_check_mark: Ready | Official Google REST endpoints for search, trash, archive, labels, draft, and send |
| **Authoritative State Verification** | :white_check_mark: Verified | Re-queries provider state to verify label mutations |
| **Idempotency Protection** | :white_check_mark: Verified | Prevents duplicate execution upon retries or worker restarts |
| **Secret Redaction** | :white_check_mark: Verified | Redacts tokens, passwords, and authorization headers from audit logs |
| **Interactive UI** | :white_check_mark: Verified | Next.js 16 + React 19 + Tailwind CSS + Lucide responsive interface |
| **Docker Self-Hosting** | :white_check_mark: Ready | Multi-stage Dockerfile and docker-compose.yml |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js `v20.0+` or `v22.0+`
- npm `10.0+`

### Installation
```bash
# 1. Clone repository
git clone https://github.com/your-org/open-source-ai-virtual-assistant.git
cd open-source-ai-virtual-assistant

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

The test suite runs 22 automated tests covering unit, integration, security, and E2E API routes:

```bash
# Run unit and integration tests with Vitest
npm test

# Run TypeScript type check
npx tsc --noEmit

# Run Next.js production build
npm run build
```

### Verified Test Results
```text
 ✓ tests/unit/test_sanitizer.test.ts (4 tests)
 ✓ tests/unit/test_policy_engine.test.ts (4 tests)
 ✓ tests/unit/test_tool_registry.test.ts (3 tests)
 ✓ tests/integration/test_gmail_mock.test.ts (5 tests)
 ✓ tests/integration/test_execution_engine.test.ts (1 test)
 ✓ tests/security/test_security_gates.test.ts (3 tests)
 ✓ tests/e2e/test_api_routes.test.ts (2 tests)

Test Files  7 passed (7)
Tests       22 passed (22)
Duration    ~500ms
```

---

## Self-Hosting with Docker

Deploy anywhere with Docker Compose:

```bash
# Build and run containerized application
docker compose up -d

# View logs
docker compose logs -f assistant
```

Persistent application state is saved to the mapped `./data` volume.

---

## Bring Your Own Key (BYOK) Configuration

Configure your preferred AI provider in `.env.local` or directly through the UI:

### 1. Deterministic Mock (Default)
```env
AI_PROVIDER=mock
```
*Zero cost, no API keys needed. Ideal for testing and CI.*

### 2. Google Gemini
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
```

### 3. OpenAI or Compatible (Ollama, Groq, OpenRouter)
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

---

## Gmail Integration Setup

### Mock Sandbox Mode (Default)
Out of the box, `useMockGmail: true` is active. It runs with zero external Google credentials and includes pre-seeded messages:
- Qualifying old newsletters from 6–7 years ago
- Protected tax documents from `@irs.gov`
- Protected credit card receipts from `@chase.com`
- User-starred mentor notes
- Recent messages from this year

### Live Google OAuth 2.0 Mode
To connect a real Google account:
1. Create a Google Cloud project with the **Gmail API** enabled.
2. Create an **OAuth 2.0 Web Application Client**.
3. Add Authorized Redirect URI: `http://localhost:3000/api/integrations/gmail/callback`.
4. Add to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
   ```
5. In the UI Integrations tab, toggle off "Use Mock Sandbox".

---

## Extensibility Roadmap

The modular adapter design enables future integrations without modifying the core planning and policy engine:
- **Google Calendar**: Event scheduling, conflict detection, attendee notifications
- **Google Drive**: Document organization, sensitive file isolation
- **Local Automation**: Allowlisted shell utilities inside sandboxed environments
- **Developer Tools**: GitHub issue triage, PR reviews, CI pipeline checks

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
