import { describe, it, expect, beforeEach } from 'vitest';
import { POST as chatPOST } from '@/app/api/assistant/chat/route';
import { POST as approvePOST } from '@/app/api/assistant/approve/route';
import { GET as auditGET } from '@/app/api/audit/route';
import { GET as prefGET, POST as prefPOST } from '@/app/api/preferences/route';
import { GET as intGET, POST as intPOST } from '@/app/api/integrations/route';
import { AppStorage } from '@/lib/storage/db';
import { NextRequest } from 'next/server';

function createJsonRequest(url: string, body: any): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('API Routes E2E - Full Interactive Workflow', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('handles chat request, pauses for approval, and completes upon user authorization', async () => {
    // 1. Submit chat request
    const chatReq = createJsonRequest('http://localhost:3000/api/assistant/chat', {
      message: 'Find emails older than five years that I no longer need and clean them up.'
    });

    const chatRes = await chatPOST(chatReq);
    expect(chatRes.status).toBe(200);
    const chatData = await chatRes.json();

    expect(chatData.requiresApproval).toBe(true);
    expect(chatData.plan).toBeDefined();
    expect(chatData.plan.status).toBe('awaiting_approval');
    expect(chatData.plan.affectedResourcePreview?.count).toBe(3);

    const planId = chatData.plan.id;

    // 2. Submit approval
    const approveReq = createJsonRequest('http://localhost:3000/api/assistant/approve', {
      planId,
      approved: true
    });

    const approveRes = await approvePOST(approveReq);
    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();

    expect(approveData.plan.status).toBe('succeeded');
    expect(approveData.summary.succeeded).toBe(3);
    expect(approveData.summary.verified).toBeGreaterThan(0);

    // 3. Inspect audit log
    const auditRes = await auditGET();
    expect(auditRes.status).toBe(200);
    const auditData = await auditRes.json();
    expect(auditData.events.length).toBeGreaterThan(0);
    expect(auditData.events[0].actionId).toBeDefined();
  });

  it('manages preferences and integration config via API', async () => {
    // Test preferences GET & POST
    const prefRes = await prefGET();
    expect(prefRes.status).toBe(200);
    const prefData = await prefRes.json();
    expect(prefData.preferences.timezone).toBe('America/New_York');

    const updateReq = createJsonRequest('http://localhost:3000/api/preferences', {
      timezone: 'Europe/London',
      responseStyle: 'detailed'
    });
    const updateRes = await prefPOST(updateReq);
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.preferences.timezone).toBe('Europe/London');
    expect(updateData.preferences.responseStyle).toBe('detailed');

    // Test integrations GET & POST
    const intRes = await intGET();
    expect(intRes.status).toBe(200);
    const intData = await intRes.json();
    expect(intData.integrations.length).toBeGreaterThan(0);
    expect(intData.config.useMockGmail).toBe(true);

    const configReq = createJsonRequest('http://localhost:3000/api/integrations', {
      aiProvider: 'gemini'
    });
    const configRes = await intPOST(configReq);
    expect(configRes.status).toBe(200);
    const configData = await configRes.json();
    expect(configData.config.aiProvider).toBe('gemini');
  });
});
