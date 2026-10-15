import { NextRequest, NextResponse } from 'next/server';
import { GmailOAuthManager } from '@/lib/integrations/gmail/oauth';
import { AppStorage } from '@/lib/storage/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code in OAuth callback.' }, { status: 400 });
  }

  try {
    const oauthManager = new GmailOAuthManager();
    const _tokens = await oauthManager.exchangeCodeForTokens(code);

    AppStorage.initialize();
    AppStorage.updateIntegrationConfig({
      useMockGmail: false
    });

    return NextResponse.redirect(new URL('/?oauth=success', req.url));
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(err.message || 'Token exchange failed')}`, req.url));
  }
}
