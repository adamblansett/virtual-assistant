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

  it('manages meeting dossiers, note processing, travel, and routines via REST API', async () => {
    // 1. Meeting Dossier API
    const { GET: dossierGET, POST: dossierPOST } = await import('@/app/api/meetings/dossier/route');
    
    // GET all dossiers
    const dListReq = new NextRequest(new URL('http://localhost:3000/api/meetings/dossier'));
    const dListRes = await dossierGET(dListReq);
    expect(dListRes.status).toBe(200);
    const dListData = await dListRes.json();
    expect(Array.isArray(dListData.dossiers)).toBe(true);

    // POST process meeting notes
    const notesReq = createJsonRequest('http://localhost:3000/api/meetings/dossier', {
      action: 'process_notes',
      meetingTitle: 'Client Review Meeting',
      rawNotes: '- Action: Send project charter\n- Todo: Review invoice'
    });
    const notesRes = await dossierPOST(notesReq);
    expect(notesRes.status).toBe(200);
    const notesData = await notesRes.json();
    expect(notesData.result.extractedTasks.length).toBe(2);

    // 2. Travel API
    const { GET: travelGET, POST: travelPOST } = await import('@/app/api/travel/route');

    // GET trips
    const trRes = await travelGET();
    expect(trRes.status).toBe(200);
    const trData = await trRes.json();
    expect(trData.trips.length).toBeGreaterThanOrEqual(1);

    // POST extract travel
    const extractReq = createJsonRequest('http://localhost:3000/api/travel', {
      action: 'extract'
    });
    const extractRes = await travelPOST(extractReq);
    expect(extractRes.status).toBe(200);

    // 3. Routines API
    const { GET: routinesGET, POST: routinesPOST } = await import('@/app/api/routines/route');

    // POST trigger morning routine
    const routineReq = createJsonRequest('http://localhost:3000/api/routines', {
      routineType: 'morning_briefing'
    });
    const routineRes = await routinesPOST(routineReq);
    expect(routineRes.status).toBe(200);
    const routineData = await routineRes.json();
    expect(routineData.result.status).toBe('succeeded');

    // GET routine history
    const historyRes = await routinesGET();
    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.routines.length).toBeGreaterThanOrEqual(1);
  });
});
