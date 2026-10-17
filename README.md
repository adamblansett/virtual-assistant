# Open-Source AI Virtual Assistant

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/Tests-117%2F117%20Passing-emerald.svg)](tests/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

An **evidence-driven, privacy-first, extensible, self-hostable autonomous AI Virtual Assistant**.

Unlike conversational chatbots that merely instruct humans on how to perform manual tasks, this virtual assistant understands natural-language requests, synthesizes structured inspectable execution plans, verifies permissions, and executes authorized tasks through real integrations with post-execution state verification.

---

## The Ultimate Goal: Complete Replacement of a Paid Human Assistant

The explicit mission and ultimate goal of this application is to **completely replace the job of a full-time paid human Executive Assistant (EA) / Personal Assistant (PA)** ($50,000–$100,000/year value):

1. **Inbox Zero & Email Management**: Triaging communications, separating urgent inquiries from records, and drafting in-voice responses.
2. **Calendar Mastery & Gatekeeping**: Guarding focus time, finding open meeting slots with 15-minute buffers, and resolving scheduling conflicts via Google Calendar v3.
3. **Meeting Intelligence & Preparation**: Compiling strategic briefing dossiers (attendee bios, VIP status, email threads, talking points) before calls.
4. **Post-Meeting Note Processing**: Ingesting messy notes, extracting action items into task tracking systems, and drafting follow-up recaps for attendees.
5. **Travel & Itinerary Coordination**: Scanning confirmations, building day-by-day flight and hotel itineraries with packing tips, and syncing to calendar.
6. **Executive CRM & Relationship Cadence**: Monitoring VIP contacts and alerting the executive when relationship follow-ups are overdue.
7. **Expense & Receipt Management**: Aggregating spend by category (software, travel, meals, office), parsing PDF/image receipts via OCR, and verifying receipts against transactions.
8. **Proactive Daily Routines**: Running Morning Kickoffs, Evening Wrap-Ups (task rollover audits), and Weekly Executive Audits without waiting to be prompted.
9. **Zero-Trust Safety & Authorization**: Enforcing server-side policy gates, human confirmation for bulk or consequential actions, and immutable audit logs.
10. **Omnichannel Mobile Gateway**: Ingesting requests from Telegram, WhatsApp, Slack, SMS, and browser voice memos; issuing remote inline approval buttons.

For a full breakdown of what is implemented versus the long-term vision, see the [Strategic Product Roadmap](ROADMAP.md).

---

## Core Capabilities & Current Status

| Capability | Status | Implementation Details |
| :--- | :--- | :--- |
| **Live Mobile Messaging Gateway** | :white_check_mark: Verified | Telegram bot webhook (`/api/webhooks/telegram`), inline buttons (`[✓ Approve]` / `[✕ Reject]`), voice memo routing |
| **Google Calendar Live REST API** | :white_check_mark: Verified | Official Google Calendar API v3 REST endpoints, OAuth 2.0 token management, Google Meet conference links, offline fallback |
| **Browser Voice & Audio Interface** | :white_check_mark: Verified | Direct microphone recording via `MediaRecorder` and spoken morning briefing audio readout via `window.speechSynthesis` |
| **Executive Voice Match & Ghostwriter** | :white_check_mark: Verified | In-voice email replies tailored by formality (1-5), brevity, sign-offs, and communication rules |
| **Multi-Turn Scheduling Coordinator** | :white_check_mark: Verified | Inbound email meeting negotiation, buffer enforcement, mutual open slot proposals, auto-calendar bookings |
| **PDF & Receipt OCR Invoice Parser** | :white_check_mark: Verified | Extracts merchant, date, total, VAT/tax, line items, and reconciles entries directly into the expense ledger |
| **Cloud Document & Drive Sync** | :white_check_mark: Verified | Indexes enterprise MSAs, board decks, contracts, and filings; semantic search and clause summarization |
| **Real-Time Flight Status Tracking** | :white_check_mark: Verified | Delay telemetry, gate and terminal detection, baggage carousel alerts, and automatic calendar rescheduling |
| **Autonomous Headless Scheduler** | :white_check_mark: Verified | Standalone cron daemon (`scripts/scheduler_daemon.ts`) evaluating routines without browser interaction |
| **Omnichannel Request Pipeline** | :white_check_mark: Verified | Ingestion adapter routing requests across Telegram, WhatsApp, Slack, and voice memos |
| **Mobile Approval Gate** | :white_check_mark: Verified | Out-of-band authorization tokens with remote one-tap callback execution |
| **Executive Daily Briefing** | :white_check_mark: Verified | Aggregates daily calendar schedule, urgent unread emails, stalled VIP follow-ups, due tasks, and expenses |
| **Inbox Triage & Action Items** | :white_check_mark: Verified | Classifies emails into `needs_action`, `finance_and_records`, and `low_priority` with suggested actions |
| **Smart Scheduling & Free Slots** | :white_check_mark: Verified | Computes open meeting slots during business hours (9 AM - 5 PM) with automated 15-minute buffers |
| **Meeting Intelligence & Dossiers** | :white_check_mark: Verified | Prepares briefing packets before VIP calls with attendee bios, email history, open tasks, and talking points |
| **Meeting Notes & Task Extraction** | :white_check_mark: Verified | Ingests raw meeting notes, extracts action item tasks, and drafts professional follow-up email recaps |
| **Travel & Itinerary Management** | :white_check_mark: Verified | Scans inbox for airline/hotel bookings, builds day-by-day itineraries, packing tips, and syncs calendar |
| **Proactive Automation Routines** | :white_check_mark: Verified | Morning Kickoff, Evening Wrap-Up (completed vs rollover task auditing), and Weekly Executive Audits |
| **Executive Tasks & To-Dos** | :white_check_mark: Verified | Full action item management with priority ratings, status toggling, due dates, and provenance tracking |
| **VIP Relationship CRM** | :white_check_mark: Verified | Tracks VIP relationships, communication history, meeting notes, and flags overdue follow-up cadences |
| **Conversational Planner** | :white_check_mark: Verified | Converts natural language into typed `TaskPlan` models |
| **Central Policy Engine** | :white_check_mark: Verified | Server-side risk ratings (`read`, `reversible_write`, `consequential`, `high_risk`) |
| **Approval Gates** | :white_check_mark: Verified | Explicit user confirmation required for bulk modifications & consequential send actions |
| **Protected Categories** | :white_check_mark: Verified | Protects tax, financial, receipts, and starred emails from automatic cleanup |
| **Prompt Injection Defense** | :white_check_mark: Verified | Sanitizes inputs, disarms adversarial phrases, and wraps data in `<UNTRUSTED_DATA>` boundaries |
| **Gmail Mock Sandbox** | :white_check_mark: Verified | Deterministic in-memory adapter pre-seeded with realistic test emails |
| **Gmail Live OAuth 2.0** | :white_check_mark: Verified | Official Google REST endpoints for search, trash, archive, labels, draft, and send |
| **Sandboxed File System** | :white_check_mark: Verified | Safe directory traversal containment (`data/workspace`), read, write, and move operations |
| **Durable Background Job Queue** | :white_check_mark: Verified | File-backed state persistence, restart recovery, step checkpointing, and approval pauses |
| **AI Evaluation Suite (Section 9)** | :white_check_mark: Verified | 15 benchmark tests verifying planning, ambiguity, sequencing, safety, and reporting |
| **Authoritative State Verification** | :white_check_mark: Verified | Re-queries provider state to verify mutations |
| **Production Dockerization** | :white_check_mark: Verified | Multi-stage Dockerfile, docker-compose.yml, and `/api/health` healthcheck endpoint |

---

## Quickstart

### Prerequisites
- Node.js 20+ (Node.js 22 recommended)
- npm 10+
- (Optional) Docker & Docker Compose for containerized deployment

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run test suite (117 tests passing)
npm test

# 3. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the interactive executive dashboard.

---

## Production Deployment & Docker

Deploy self-hosted with Docker Compose:

```bash
# 1. Prepare environment
cp .env.example .env
nano .env

# 2. Build and launch services in background
docker-compose up --build -d

# 3. Verify health status
curl -s http://localhost:3000/api/health | jq .
```

Docker Compose runs two synchronized services sharing the `./data` persistent volume:
1. `virtual-assistant-web`: The Next.js 16 Web Dashboard and API routes on port 3000.
2. `virtual-assistant-scheduler`: The headless background daemon evaluating recurring morning kickoffs, evening wrap-ups, and weekly audits.

---

## Testing & Quality Assurance

```bash
# Run unit, integration, evals, and E2E suites
npm test

# Run strict TypeScript typechecking
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Production Next.js build
npm run build
```

---

## ⚖️ Legal Disclaimer & Limitation of Liability

### 1. "AS IS" and Express Warranty Disclaimer
This software, documentation, automated conversational planning engine, email ghostwriter, calendar coordinator, expense reconciler, and background scheduler are provided on an **"AS IS"** and **"AS AVAILABLE"** basis, **WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND**, either express, implied, statutory, or otherwise. To the maximum extent permitted by applicable law, the author, copyright holders, and contributors expressly disclaim all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, quiet enjoyment, accuracy, and non-infringement.

### 2. Autonomous Action & Third-Party Service Side Effects
- **Live System Mutations:** This application integrates with live external APIs and services (including Google Workspace, Gmail API, Google Calendar API v3, Telegram, WhatsApp, Slack, and cloud storage). Autonomous, scheduled, or user-prompted execution can send live emails, delete/trash messages, create, update, or cancel calendar appointments, modify contact databases, reconcile financial ledgers, and modify local or cloud files.
- **User Oversight Mandate:** The user assumes sole and exclusive responsibility for supervising, configuring, and verifying all actions executed by the assistant, setting appropriate policy safety gates (e.g., `consequential` / `high_risk` approval requirements), and monitoring OAuth permission scopes.
- **No Liability for Operational Side Effects:** The author and contributors accept zero responsibility or liability for lost, archived, or deleted emails; missed meetings; cancelled calendar events; erroneous ghostwritten communications; leaked confidential information; scheduling conflicts; or damaged business or personal relationships resulting from assistant actions.

### 3. Generative AI Non-Determinism & Hallucinations
- The conversational planner, executive briefing generator, ghostwriter, meeting dossier compiler, and document summarizer rely on large language models (LLMs). LLMs are inherently non-deterministic, probabilistic, and capable of generating inaccurate, fabricated (hallucinated), misleading, or outdated information.
- Outputs, briefing dossiers, flight telemetry, and drafted messages must **always** be reviewed by a human before relying on them or sending them to third parties.

### 4. Not Certified Accounting, Legal, Tax, or Medical Advice
- Expense categorization, OCR invoice parsing, and receipt aggregation are provided strictly for developer workflow convenience and do **not** constitute certified bookkeeping, accounting, auditing, or tax preparation services.
- Document search and contract clause indexing do **not** constitute legal review or legal counsel.
- Flight tracking and itinerary coordination rely on third-party APIs and do not guarantee flight schedule accuracy.

### 5. CRITICAL: NO EMERGENCY SERVICES
**THIS SOFTWARE IS NOT INTENDED, DESIGNED, LICENSED, OR AUTHORIZED FOR USE IN EMERGENCY COMMUNICATIONS, EMERGENCY SERVICES DISPATCH (SUCH AS 911, E911, 999, 112, OR PUBLIC SAFETY ANSWERING POINTS), OR LIFE-CRITICAL SYSTEMS.**

### 6. Limitation of Liability
To the maximum extent permitted by applicable law, **IN NO EVENT SHALL THE AUTHOR, COPYRIGHT HOLDERS, OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES** (including, but not limited to, loss of use, data, revenue, profits, business, or goodwill; missed meetings; missed flights or travel disruptions; misrouted or deleted communications; breach of confidentiality; contract disputes; regulatory fines; or the cost of procuring substitute executive assistant services), however caused and on any theory of liability, whether in contract, strict liability, tort (including negligence or otherwise), or statute, arising in any way out of the use, reproduction, modification, distribution, or reliance upon this software, even if advised of the possibility of such damages.

### 7. Third-Party Trademarks & Non-Affiliation
All product names, logos, brands, and registered trademarks mentioned within this project (including Google, Gmail, Google Calendar, Google Meet, Telegram, WhatsApp, Meta, Slack, Next.js, Node.js, and Vitest) are the property of their respective owners. Mention of these platforms or protocols does not imply endorsement, sponsorship, or affiliation with the author.

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
