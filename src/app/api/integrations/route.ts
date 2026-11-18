import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req?: NextRequest) {
  const auth = SecurityAuth.verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
  }

  AppStorage.initialize();
  const rawConfig = AppStorage.getIntegrationConfig();
  const config = SecurityAuth.maskIntegrationConfig(rawConfig);
  const adapter = WorkflowExecutionEngine.getGmailAdapter();
  const gmailMeta = await adapter.metadata();

  return NextResponse.json({
    config,
    integrations: [
      gmailMeta,
      {
        id: 'ai_provider',
        name: `AI Model Provider (${config.aiProvider.toUpperCase()})`,
        description: 'Large language model provider for conversational understanding and task planning.',
        connected: true,
        scopesGranted: ['tool_calling', 'structured_plan'],
        isMock: config.aiProvider === 'mock'
      }
    ]
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await req.json();
    AppStorage.initialize();
    AppStorage.updateIntegrationConfig(body);
    const masked = SecurityAuth.maskIntegrationConfig(AppStorage.getIntegrationConfig());
    return NextResponse.json({ success: true, config: masked });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
