import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { CryptoVault } from '@/lib/security/vault';
import { SecurityAuth } from '@/lib/security/auth';
import { GmailOAuthManager } from '@/lib/integrations/gmail/oauth';
import { AIProviderFactory } from '@/lib/ai/adapter';
import { GeminiProvider } from '@/lib/ai/gemini';
import { OpenAICompatibleProvider } from '@/lib/ai/openai';
import { TelegramBotService } from '@/lib/services/telegram';
import { ToolRegistry } from '@/lib/tools/registry';
import { MemoryService } from '@/lib/services/memory';
import { WebResearchService } from '@/lib/services/web_research';
import { OmnichannelIngestionService } from '@/lib/services/omnichannel';
import { ReceiptParserService } from '@/lib/services/receipt_parser';
import { CloudDriveSyncService } from '@/lib/services/drive_sync';
import { FlightTrackerService } from '@/lib/services/flight_tracker';
import { TaskPlanner } from '@/lib/planner/planner';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { TaskPlan } from '@/types';

describe('Production Upgrades: Security, Live APIs, Memory, Web Research & Agent Loop', () => {
  beforeEach(() => {
    AppStorage.reset();
    WorkflowExecutionEngine.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.ASSISTANT_API_TOKEN;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.AVIATIONSTACK_API_KEY;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    vi.restoreAllMocks();
  });

  describe('1. AES-256-GCM Credential Vault & Persistent OAuth Tokens', () => {
    it('encrypts and decrypts secrets with AES-256-GCM', () => {
      const plaintext = 'sk-proj-super-secret-api-key-999';
      const ciphertext = CryptoVault.encrypt(plaintext);

      expect(ciphertext).not.toBe(plaintext);
      expect(CryptoVault.isEncrypted(ciphertext)).toBe(true);
      expect(CryptoVault.decrypt(ciphertext)).toBe(plaintext);
    });

    it('encrypts API keys and OAuth tokens on disk while returning plaintext in memory', () => {
      AppStorage.updateIntegrationConfig({
        aiProvider: 'gemini',
        geminiApiKey: 'AIzaSyTestSecretKey12345',
        telegramBotToken: '123456:ABC-DEF-TelegramSecret'
      });

      AppStorage.saveOAuthTokens({
        accessToken: 'ya29.live_access_token_secret',
        refreshToken: '1//live_refresh_token_secret',
        expiresAt: Date.now() + 3600000,
        email: 'exec@company.com',
        scopes: GmailOAuthManager.DEFAULT_SCOPES
      });

      // Verify in-memory getters return decrypted values
      const memConfig = AppStorage.getIntegrationConfig();
      expect(memConfig.geminiApiKey).toBe('AIzaSyTestSecretKey12345');
      expect(memConfig.telegramBotToken).toBe('123456:ABC-DEF-TelegramSecret');

      const memOAuth = AppStorage.getOAuthTokens();
      expect(memOAuth?.accessToken).toBe('ya29.live_access_token_secret');
      expect(memOAuth?.refreshToken).toBe('1//live_refresh_token_secret');

      // Inspect raw JSON file on disk to verify secrets are encrypted at rest
      const dbPath = path.join(process.cwd(), '.data', 'assistant_db.json');
      if (fs.existsSync(dbPath)) {
        const rawDiskContent = fs.readFileSync(dbPath, 'utf-8');
        expect(rawDiskContent).not.toContain('AIzaSyTestSecretKey12345');
        expect(rawDiskContent).not.toContain('ya29.live_access_token_secret');
        expect(rawDiskContent).toContain('enc:v1:');
      }
    });

    it('persists OAuth tokens across GmailOAuthManager instances and requests Calendar & Drive scopes', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

      const manager1 = new GmailOAuthManager();
      const authUrl = manager1.getAuthUrl('state_123');
      expect(authUrl).toContain('calendar');
      expect(authUrl).toContain('drive.readonly');
      expect(authUrl).toContain('gmail.modify');

      manager1.setTokensDirectly({
        accessToken: 'ya29.persisted_token',
        refreshToken: '1//persisted_refresh',
        expiresAt: Date.now() + 3600000,
        scopes: GmailOAuthManager.DEFAULT_SCOPES
      });

      // New instance without explicit tokens should load persisted tokens from AppStorage
      const manager2 = new GmailOAuthManager();
      const token = await manager2.getValidAccessToken();
      expect(token).toBe('ya29.persisted_token');
    });
  });

  describe('2. Live Wiring: UI API Keys, Full Tool JSON Schemas & Webhook Auth', () => {
    it('reads Gemini, OpenAI, and Telegram credentials configured in AppStorage', () => {
      AppStorage.updateIntegrationConfig({
        aiProvider: 'gemini',
        geminiApiKey: 'AIzaSyStoredInUI',
        openaiApiKey: 'sk-StoredInUI',
        telegramBotToken: '999888:UITelegramToken'
      });

      const geminiProvider = AIProviderFactory.getProvider('gemini');
      expect(geminiProvider).toBeInstanceOf(GeminiProvider);
      expect(AIProviderFactory.isLiveProviderConfigured()).toBe(true);

      const openaiProvider = AIProviderFactory.getProvider('openai');
      expect(openaiProvider).toBeInstanceOf(OpenAICompatibleProvider);

      expect(TelegramBotService.getBotToken()).toBe('999888:UITelegramToken');
    });

    it('exports full JSON Schema properties and required fields for registered tools', () => {
      const createTaskTool = ToolRegistry.getTool('tasks_create');
      expect(createTaskTool).toBeDefined();

      const jsonSchema = ToolRegistry.getToolJsonSchema(createTaskTool!);
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(jsonSchema.properties.title).toBeDefined();
      expect(jsonSchema.required).toContain('title');
    });

    it('enforces constant-time Bearer token and Telegram webhook secret verification', () => {
      process.env.ASSISTANT_API_TOKEN = 'secret-api-token-2026';
      process.env.TELEGRAM_WEBHOOK_SECRET = 'tg-webhook-secret-999';

      const unauthorizedReq = new NextRequest('http://localhost:3000/api/assistant/chat', {
        method: 'POST'
      });
      expect(SecurityAuth.verifyApiRequest(unauthorizedReq).authorized).toBe(false);

      const authorizedReq = new NextRequest('http://localhost:3000/api/assistant/chat', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret-api-token-2026'
        }
      });
      expect(SecurityAuth.verifyApiRequest(authorizedReq).authorized).toBe(true);

      const badTgReq = new NextRequest('http://localhost:3000/api/webhooks/telegram', {
        method: 'POST',
        headers: {
          'x-telegram-bot-api-secret-token': 'wrong-secret'
        }
      });
      expect(SecurityAuth.verifyTelegramWebhook(badTgReq).authorized).toBe(false);

      const goodTgReq = new NextRequest('http://localhost:3000/api/webhooks/telegram', {
        method: 'POST',
        headers: {
          'x-telegram-bot-api-secret-token': 'tg-webhook-secret-999'
        }
      });
      expect(SecurityAuth.verifyTelegramWebhook(goodTgReq).authorized).toBe(true);
    });
  });

  describe('3. Persistent Executive Memory & SSRF-Safe Web Research', () => {
    it('stores, updates, searches, and formats persistent executive memories into TaskPlanner prompts', async () => {
      const saved = await ToolRegistry.executeTool('memory_remember_fact', {
        key: 'Preferred Seat',
        value: 'Aisle seat on flights over 3 hours',
        category: 'travel'
      });
      expect(saved.fact).toContain('Preferred Seat');

      const recalled = await ToolRegistry.executeTool('memory_recall_facts', {
        query: 'aisle'
      });
      expect(recalled.length).toBeGreaterThanOrEqual(1);
      expect(recalled.some((m: any) => m.fact.includes('Aisle seat on flights over 3 hours'))).toBe(true);

      const promptSection = MemoryService.formatMemoriesForPrompt();
      expect(promptSection).toContain('Preferred Seat');
      expect(promptSection).toContain('Aisle seat on flights over 3 hours');
    });

    it('blocks SSRF internal/private/loopback URLs while permitting public HTTPS URLs', () => {
      expect(() => WebResearchService.validateSafeUrl('http://127.0.0.1:8080/admin')).toThrow(/SSRF Protection/);
      expect(() => WebResearchService.validateSafeUrl('http://localhost:3000/api/health')).toThrow(/SSRF Protection/);
      expect(() => WebResearchService.validateSafeUrl('http://169.254.169.254/latest/meta-data/')).toThrow(/SSRF Protection/);
      expect(() => WebResearchService.validateSafeUrl('http://192.168.1.1/router')).toThrow(/SSRF Protection/);
      expect(() => WebResearchService.validateSafeUrl('file:///etc/passwd')).toThrow(/Unsupported URL protocol/);

      const safe = WebResearchService.validateSafeUrl('https://example.com/research');
      expect(safe.hostname).toBe('example.com');
    });
  });

  describe('4. Multi-Step Dynamic Output-to-Input Chaining & Live Service Upgrades', () => {
    it('interpolates {{$prev.field}} across sequential steps in WorkflowExecutionEngine', async () => {
      const plan: TaskPlan = {
        id: 'plan_chain_test',
        userRequestId: 'req_chain_1',
        originalPrompt: 'Remember VIP preference and create follow-up task',
        summary: 'Chained workflow execution test',
        status: 'proposed',
        requiresUserConfirmation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            id: 'act_step_1',
            integration: 'assistant',
            toolName: 'memory_remember_fact',
            arguments: {
              key: 'Venue',
              value: 'Le Bernardin NYC',
              category: 'preference'
            },
            requiredPermission: 'assistant.write',
            targetResource: 'assistant:memory',
            expectedOutcome: 'Save venue preference',
            riskLevel: 'reversible_write',
            approvalRequired: false,
            status: 'proposed',
            verificationStatus: 'pending',
            retryCount: 0
          },
          {
            id: 'act_step_2',
            integration: 'assistant',
            toolName: 'tasks_create',
            arguments: {
              title: 'Book reservation ({{$prev.fact}})',
              priority: 'high'
            },
            requiredPermission: 'tasks.write',
            targetResource: 'assistant:tasks',
            expectedOutcome: 'Create task using previous step output',
            riskLevel: 'reversible_write',
            approvalRequired: false,
            status: 'proposed',
            verificationStatus: 'pending',
            retryCount: 0
          }
        ]
      };

      const { plan: executedPlan, summary } = await WorkflowExecutionEngine.executePlan(plan, true);
      expect(executedPlan.status).toBe('succeeded');
      expect(summary.succeeded).toBe(2);
      expect(executedPlan.actions[1].arguments.title).toBe('Book reservation (Venue: Le Bernardin NYC)');
    });

    it('supports audio payload transcription, AI receipt parsing, Drive API v3 sync, and live flight lookup', async () => {
      // 1. Audio transcription fallback
      const audioRes = await OmnichannelIngestionService.transcribeAudioPayload(
        'data:audio/webm;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        'audio/webm'
      );
      expect(audioRes.transcript.length).toBeGreaterThan(10);

      // 2. AI receipt parsing fallback
      const parsedReceipt = await ReceiptParserService.parseReceiptWithAI(
        'Merchant: Delta Airlines\nTotal: $640.00\nTax: $40.00\nDate: 2025-05-12',
        'delta_receipt.pdf'
      );
      expect(parsedReceipt.merchantName).toContain('Delta');
      expect(parsedReceipt.totalAmount).toBe(640);

      // 3. Google Drive sync with mocked fetch when OAuth is configured
      process.env.GOOGLE_CLIENT_ID = 'client_id';
      process.env.GOOGLE_CLIENT_SECRET = 'client_secret';
      AppStorage.saveOAuthTokens({
        accessToken: 'ya29.drive_token',
        expiresAt: Date.now() + 3600000,
        scopes: GmailOAuthManager.DEFAULT_SCOPES
      });

      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: 'gdrive_99',
                name: 'Q4 M&A Term Sheet.pdf',
                mimeType: 'application/pdf',
                modifiedTime: new Date().toISOString(),
                description: 'Confidential M&A acquisition terms'
              }
            ]
          }),
          { status: 200 }
        )
      );

      const driveSync = await CloudDriveSyncService.syncFromGoogleDrive(10);
      expect(driveSync.mode).toBe('live_google_drive');
      expect(driveSync.syncedCount).toBe(1);
      expect(AppStorage.getDocument('drive_gdrive_99')?.title).toBe('Q4 M&A Term Sheet.pdf');

      // 4. Live AviationStack flight status lookup
      process.env.AVIATIONSTACK_API_KEY = 'live_aviation_key';
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                flight_status: 'active',
                airline: { name: 'Delta Air Lines' },
                departure: {
                  iata: 'BOS',
                  scheduled: '2026-10-18T10:00:00Z',
                  estimated: '2026-10-18T10:25:00Z',
                  gate: 'A18',
                  delay: 25
                },
                arrival: {
                  iata: 'SFO',
                  scheduled: '2026-10-18T16:00:00Z',
                  estimated: '2026-10-18T16:25:00Z',
                  gate: 'D9',
                  baggage: 'Carousel 5'
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

      const flightStatus = await FlightTrackerService.trackFlight('DL 900');
      expect(flightStatus.status).toBe('delayed');
      expect(flightStatus.delayMinutes).toBe(25);
      expect(flightStatus.departureGate).toBe('A18');
      expect(flightStatus.arrivalAirport).toBe('SFO');
    });

    it('plans memory and web research tasks via TaskPlanner', async () => {
      const planner = new TaskPlanner(AIProviderFactory.getProvider('mock'), AppStorage.getPreferences());
      const memPlan = await planner.createPlan('Remember that I prefer morning flights before 10am');
      expect(memPlan.actions.length).toBe(1);
      expect(memPlan.actions[0].toolName).toBe('memory_remember_fact');
    });
  });
});
