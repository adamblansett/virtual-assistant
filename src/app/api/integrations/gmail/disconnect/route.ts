import { NextResponse } from 'next/server';
import { GmailOAuthManager } from '@/lib/integrations/gmail/oauth';
import { AppStorage } from '@/lib/storage/db';

export async function POST() {
  try {
    const oauthManager = new GmailOAuthManager();
    await oauthManager.revokeTokens();

    AppStorage.initialize();
    AppStorage.updateIntegrationConfig({
      useMockGmail: true
    });

    return NextResponse.json({
      success: true,
      message: 'Google account disconnected successfully. Switched to Mock Sandbox.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Disconnect failed.' }, { status: 500 });
  }
}
