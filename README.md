# Open-Source AI Virtual Assistant

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/Tests-131%2F131%20Passing-emerald.svg)](tests/)
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
| **Open-Weight Models (Ollama / vLLM)** | :white_check_mark: Verified | Local & self-hosted open-weight LLM adapter (`qwen2.5:14b`, `qwen2.5:7b`, `qwen3:8b`, `llama3.1:8b`, `llama3.3:70b`, `mistral-small:24b`, `gemma3:12b`, `gemma3:27b`), `<think>` tag stripping, JSON tool fallback, and 1-click UI `ollama pull` |
| **AES-256-GCM Credential Vault** | :white_check_mark: Verified | Encrypts stored API keys (`geminiApiKey`, `openaiApiKey`, `telegramBotToken`, `openWeightApiKey`) and OAuth tokens at rest using `scryptSync` + AES-256-GCM with atomic file writes |
| **Persistent Long-Term Memory** | :white_check_mark: Verified | Stores & recalls executive preferences, VIP notes, and travel habits (`memory_remember_fact` / `memory_recall_facts`) and injects them into AI planning prompts |
| **SSRF-Safe Web Research & URL Reader** | :white_check_mark: Verified | Live `web_search` and `web_read_url` tools with SSRF IP/loopback/metadata blocking and `<UNTRUSTED_WEB_PAGE>` sanitization |
| **Multi-Step Dynamic Agent Chaining** | :white_check_mark: Verified | Full JSON Schema tool declarations (`ToolRegistry.getToolJsonSchema`) and runtime `{{$prev.field}}` output-to-input step chaining |
| **Live Mobile Messaging Gateway** | :white_check_mark: Verified | Telegram bot webhook (`/api/webhooks/telegram`) with constant-time secret verification, inline buttons (`[✓ Approve]` / `[✕ Reject]`), and voice memo routing |
| **Google Calendar Live REST API** | :white_check_mark: Verified | Official Google Calendar API v3 REST endpoints, persistent OAuth 2.0 token management, Google Meet conference links, offline fallback |
| **Browser Voice & Multimodal Audio** | :white_check_mark: Verified | Direct microphone recording via `MediaRecorder`, base64 audio transcription (`/api/audio/transcribe` via Gemini Multimodal Audio), and spoken morning briefing readout via `window.speechSynthesis` |
| **Executive Voice Match & Ghostwriter** | :white_check_mark: Verified | Live LLM & deterministic in-voice email replies tailored by formality (1-5), brevity, sign-offs, and communication rules |
| **Multi-Turn Scheduling Coordinator** | :white_check_mark: Verified | Inbound email meeting negotiation, buffer enforcement, mutual open slot proposals, auto-calendar bookings |
| **Multimodal Vision & Receipt OCR Parser** | :white_check_mark: Verified | Gemini Multimodal Vision & regex extraction of merchant, date, total, VAT/tax, and line items reconciled into the expense ledger |
| **Cloud Document & Google Drive v3 Sync** | :white_check_mark: Verified | Live Google Drive API v3 document sync (`drive_sync_google_drive`), semantic search, and AI clause summarization |
| **Real-Time Flight Status Tracking** | :white_check_mark: Verified | Live AviationStack flight telemetry + itinerary fallback, gate/terminal detection, baggage carousel alerts, and automatic calendar rescheduling |
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

# 2. Run test suite (131 tests passing across 26 suites)
npm test

# 3. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the interactive executive dashboard.

---

## AI Model Providers: Open-Weight (Ollama / vLLM) & BYOK

In the **Integrations & BYOK** tab (or via `.env`), you can switch between four model backends at any time:

1. **Open-Weight Local Models (`open_weight` via Ollama / vLLM)**:
   - Runs 100% locally with zero API cost and full data privacy via `http://localhost:11434/v1` (or custom vLLM / OpenRouter / Groq endpoint).
   - Built-in selectable model presets in [`src/lib/ai/openweight.ts`](src/lib/ai/openweight.ts):
     - **`qwen2.5:14b`** *(Recommended Default · ~9.0 GB VRAM/RAM)* — Best local tool-calling accuracy across all 36+ registered tools.
     - **`qwen2.5:7b`** *(~4.7 GB VRAM/RAM)* — Fast tool calling for laptops and 8 GB GPUs.
     - **`qwen3:8b`** *(~5.2 GB VRAM/RAM)* — Hybrid chain-of-thought reasoning (`<think>` auto-stripped) + tool calling.
     - **`llama3.1:8b`** *(~4.9 GB VRAM/RAM)* & **`llama3.3:70b`** *(~42 GB VRAM / Hosted)* — Meta Llama 3 instruct family.
     - **`mistral-small:24b`** *(~14 GB VRAM/RAM)* — High-precision structured JSON & executive ghostwriting.
     - **`gemma3:12b`** *(~8.1 GB VRAM/RAM)* & **`gemma3:27b`** *(~17 GB VRAM/RAM)* — Multimodal vision & executive writing with automatic fallback JSON tool-call extraction.
   - Includes live Ollama daemon health checks and a **1-click "Pull Model in Ollama"** button right in the web UI (`/api/integrations/ollama`).
2. **Google Gemini BYOK (`gemini`)**: Uses `gemini-2.5-flash` for planning, multimodal audio transcription, and vision receipt OCR.
3. **OpenAI-Compatible BYOK (`openai`)**: Supports OpenAI (`gpt-4o-mini` / `gpt-4o`), Groq, Together, or OpenRouter.
4. **Deterministic Mock (`mock`)**: Zero-cost offline test double for deterministic CI/CD verification.

---

## Production Deployment & Docker

Deploy self-hosted with Docker Compose:

```bash
# 1. Prepare environment
cp .env.example .env
nano .env

# 2. Build and launch services in background
docker-compose up --build -d

# 3. (Optional) Pull the default open-weight model inside the bundled Ollama container
docker exec -it virtual_assistant_ollama ollama pull qwen2.5:14b

# 4. Verify health status
curl -s http://localhost:3000/api/health | jq .
```

Docker Compose runs three synchronized services:
1. `virtual-assistant-web`: The Next.js 16 Web Dashboard and API routes on port 3000.
2. `virtual-assistant-scheduler`: The headless background daemon evaluating recurring morning kickoffs, evening wrap-ups, and weekly audits.
3. `ollama`: Local open-weight model server on port 11434 with persistent model weights stored in the `ollama_data` volume.

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
