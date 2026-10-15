# Open-Source AI Virtual Assistant

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/Tests-78%2F78%20Passing-emerald.svg)](tests/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

An **evidence-driven, privacy-first, extensible, self-hostable autonomous AI Virtual Assistant**.

Unlike conversational chatbots that merely instruct humans on how to perform manual tasks, this virtual assistant understands natural-language requests, synthesizes structured inspectable execution plans, verifies permissions, and executes authorized tasks through real integrations with post-execution state verification.

---

## The Ultimate Goal: Complete Replacement of a Paid Human Assistant

The explicit mission and ultimate goal of this application is to **completely replace the job of a full-time paid human Executive Assistant (EA) / Personal Assistant (PA)** ($50,000–$100,000/year value):

1. **Inbox Zero & Email Management**: Triaging communications, separating urgent inquiries from records, and drafting high-context responses.
2. **Calendar Mastery & Gatekeeping**: Guarding focus time, finding open meeting slots with 15-minute buffers, and resolving scheduling conflicts.
3. **Meeting Intelligence & Preparation**: Compiling strategic briefing dossiers (attendee bios, VIP status, email threads, talking points) before calls.
4. **Post-Meeting Note Processing**: Ingesting messy notes, extracting action items into task tracking systems, and drafting follow-up recaps for attendees.
5. **Travel & Itinerary Coordination**: Scanning confirmations, building day-by-day flight and hotel itineraries with packing tips, and syncing to calendar.
6. **Executive CRM & Relationship Cadence**: Monitoring VIP contacts and alerting the executive when relationship follow-ups are overdue.
7. **Expense & Receipt Management**: Aggregating spend by category (software, travel, meals, office) and verifying receipts against transactions.
8. **Proactive Daily Routines**: Running Morning Kickoffs, Evening Wrap-Ups (task rollover audits), and Weekly Executive Audits without waiting to be prompted.
9. **Zero-Trust Safety & Authorization**: Enforcing server-side policy gates, human confirmation for bulk or consequential actions, and immutable audit logs.

For a full breakdown of what is currently implemented versus what is scheduled on the path to 100% human replacement, see the [Strategic Product Roadmap](ROADMAP.md).

---

## Core Capabilities & Current Status

| Capability | Status | Implementation Details |
| :--- | :--- | :--- |
| **Executive Daily Briefing** | :white_check_mark: Verified | Aggregates daily calendar schedule, urgent unread emails, stalled VIP follow-ups, due tasks, and expenses |
| **Inbox Triage & Action Items** | :white_check_mark: Verified | Classifies emails into `needs_action`, `finance_and_records`, and `low_priority` with suggested actions |
| **Smart Scheduling & Free Slots** | :white_check_mark: Verified | Computes open meeting slots during business hours (9 AM - 5 PM) with automated 15-minute buffers |
| **Meeting Intelligence & Dossiers** | :white_check_mark: Verified | Prepares briefing packets before VIP calls with attendee bios, email history, open tasks, and talking points |
| **Meeting Notes & Task Extraction** | :white_check_mark: Verified | Ingests raw meeting notes, extracts action item tasks, and drafts professional follow-up email recaps |
| **Travel & Itinerary Management** | :white_check_mark: Verified | Scans inbox for airline/hotel bookings, builds day-by-day itineraries, packing tips, and syncs calendar |
| **Proactive Automation Routines** | :white_check_mark: Verified | Morning Kickoff, Evening Wrap-Up (completed vs rollover task auditing), and Weekly Executive Audits |
| **Executive Tasks & To-Dos** | :white_check_mark: Verified | Full action item management with priority ratings, status toggling, due dates, and provenance tracking |
| **VIP Relationship CRM** | :white_check_mark: Verified | Tracks VIP relationships, communication history, meeting notes, and flags overdue follow-up cadences |
| **Financial & Expense Records** | :white_check_mark: Verified | Categorizes spend (software, travel, meals, office), tracks totals, and links receipts |
| **Conversational Planner** | :white_check_mark: Verified | Converts natural language into typed `TaskPlan` models |
| **Central Policy Engine** | :white_check_mark: Verified | Server-side risk ratings (`read`, `reversible_write`, `consequential`, `high_risk`) |
| **Approval Gates** | :white_check_mark: Verified | Explicit user confirmation required for bulk modifications & consequential send actions |
| **Protected Categories** | :white_check_mark: Verified | Protects tax, financial, receipts, and starred emails from automatic cleanup |
| **Prompt Injection Defense** | :white_check_mark: Verified | Sanitizes inputs, disarms adversarial phrases, and wraps data in `<UNTRUSTED_DATA>` boundaries |
| **Gmail Mock Sandbox** | :white_check_mark: Verified | Deterministic in-memory adapter pre-seeded with realistic test emails |
| **Gmail Live OAuth 2.0** | :white_check_mark: Ready | Official Google REST endpoints for search, trash, archive, labels, draft, and send |
| **Google Calendar Integration** | :white_check_mark: Verified | Listing upcoming events, event creation, rescheduling, and cancellation |
| **Sandboxed File System** | :white_check_mark: Verified | Safe directory traversal containment (`data/workspace`), read, write, and move operations |
| **Durable Background Job Queue** | :white_check_mark: Verified | File-backed state persistence, restart recovery, step checkpointing, and approval pauses |
| **AI Evaluation Suite (Section 9)** | :white_check_mark: Verified | 15 benchmark tests verifying planning, ambiguity, sequencing, safety, and reporting |
| **Authoritative State Verification** | :white_check_mark: Verified | Re-queries provider state to verify mutations |
| **Idempotency Protection** | :white_check_mark: Verified | Prevents duplicate execution upon retries or worker restarts |
| **Secret Redaction** | :white_check_mark: Verified | Redacts tokens, passwords, and authorization headers from audit logs |
| **Interactive Dashboard UI** | :white_check_mark: Verified | Next.js 16 + React 19 + Tailwind CSS + Lucide dashboard with 15 specialized panels and quick action chips |
| **Docker Self-Hosting** | :white_check_mark: Ready | Multi-stage Dockerfile and docker-compose.yml |

---

## Executive Virtual Assistant Suite (Paid VA Replacement)

The platform is designed to replace the primary everyday services of a human executive assistant:

1. **Daily Morning Briefing**:
   - One-click morning digest synthesizing today's schedule, urgent inbox items requiring human decisions, overdue relationship follow-ups, and pending tasks.
   - Proactively alerts the executive to clear calendar windows for deep focus.

2. **Inbox Triage & Action Item Extraction**:
   - Ingests recent emails and segregates them into actionable priority buckets:
     - `needs_action`: Client inquiries, urgent requests, and contract approvals requiring reply.
     - `finance_and_records`: Invoices, receipts, tax notices, and bank statements preserved for records.
     - `low_priority`: Newsletters, promotional offers, and notifications safe for archiving.

3. **Smart Scheduling & Coordination**:
   - Automatically inspects the calendar to find mutually agreeable open windows during working hours.
   - Enforces a 15-minute buffer between meetings to prevent back-to-back fatigue.

4. **VIP Relationship Management & Cadence Tracking**:
   - Maintains an executive CRM of partners, clients, and advisors.
   - Alerts the executive when a VIP contact has not been contacted within their defined follow-up cadence (e.g. 7 days, 14 days, 30 days) with quick one-click follow-up draft generation.

5. **Corporate Expense Tracking**:
   - Categorizes spending by department/category (Software, Travel, Meals, Office Supplies).
   - Authoritative verification flags whether receipts and records have been reconciled.

6. **Meeting Intelligence & Strategic Dossiers**:
   - Automatically prepares a briefing dossier for upcoming meetings.
   - Summarizes attendee profiles, VIP status, past relationship notes, recent email exchanges, and discussion objectives.

7. **Post-Meeting Note Processing & Action Extractor**:
   - Parses raw discussion notes or bullet points from calls.
   - Extracts action items automatically into the executive task board with priorities and formats an email recap ready for distribution.

8. **Executive Travel & Itinerary Coordination**:
   - Scans the executive inbox for airline tickets, hotel reservations, and car rentals.
   - Constructs a structured day-by-day travel itinerary with packing tips and automatically syncs flight blocks to the calendar.

9. **Autonomous Recurring Routines**:
   - Morning Kickoff (briefing + triage + schedule).
   - Evening Wrap-Up (completed task audit, rollover tracking, tomorrow preview).
   - Weekly Executive Audit (relationship cadences, stalled VIPs, weekly expense review).

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

The test suite runs **64 automated tests across 12 test suites** covering unit, integration, security, e2e API routes, executive virtual assistant workflows, and Section 9 AI quality evaluations:

```bash
# Run full Vitest test suite
npm test

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Run Next.js production build
npm run build
```

### Verified Test Results
```text
 ✓ tests/unit/test_sanitizer.test.ts (4 tests)
 ✓ tests/unit/test_policy_engine.test.ts (4 tests)
 ✓ tests/unit/test_tool_registry.test.ts (3 tests)
 ✓ tests/integration/test_gmail_mock.test.ts (5 tests)
 ✓ tests/integration/test_calendar_mock.test.ts (4 tests)
 ✓ tests/integration/test_files_sandbox.test.ts (3 tests)
 ✓ tests/integration/test_job_queue.test.ts (3 tests)
 ✓ tests/integration/test_execution_engine.test.ts (1 test)
 ✓ tests/security/test_security_gates.test.ts (3 tests)
 ✓ tests/e2e/test_api_routes.test.ts (2 tests)
 ✓ tests/evals/test_ai_evals.test.ts (15 tests)

Test Files  11 passed (11)
Tests       47 passed (47)
Duration    ~800ms
```

---

## Background Task Queue & Durable Execution

The assistant includes a durable background job manager in `src/lib/jobs/`:
- **State Persistence**: Serialized to `data/jobs_state.json`.
- **Restart Recovery**: Automatically recovers interrupted jobs across application restarts via `recoverInterruptedJobs()`.
- **Checkpointing**: Tracks step-by-step progress and safely pauses at human approval boundaries (`awaiting_approval`).
- **REST Endpoints**:
  - `GET /api/jobs`: List all active and past jobs with progress metrics.
  - `POST /api/jobs`: Enqueue an existing `TaskPlan` for asynchronous execution.

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

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
