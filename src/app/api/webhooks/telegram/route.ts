import { NextRequest, NextResponse } from 'next/server';
import { TelegramBotService } from '@/lib/services/telegram';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhook: 'telegram',
    configured: TelegramBotService.hasLiveToken(),
    secretProtected: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  const auth = SecurityAuth.verifyTelegramWebhook(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { ok: false, error: auth.reason || 'Unauthorized webhook request' },
      { status: 401 }
    );
  }

  try {
    const update = await req.json();
    const result = await TelegramBotService.handleWebhookUpdate(update);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Telegram webhook processing error' },
      { status: 500 }
    );
  }
}
