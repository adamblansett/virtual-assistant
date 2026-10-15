import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';

export async function GET() {
  AppStorage.initialize();
  const config = AppStorage.getIntegrationConfig();
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
    const body = await req.json();
    AppStorage.initialize();
    AppStorage.updateIntegrationConfig(body);
    return NextResponse.json({ success: true, config: AppStorage.getIntegrationConfig() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
