import { NextRequest, NextResponse } from 'next/server';
import { TelegramBotService } from '@/lib/services/telegram';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhook: 'telegram',
    configured: TelegramBotService.hasLiveToken(),
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
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
