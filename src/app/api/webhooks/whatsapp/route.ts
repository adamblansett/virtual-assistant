import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuth } from '@/lib/security/auth';
import { OmnichannelIngestionService } from '@/lib/services/omnichannel';
import { MobileApprovalService } from '@/lib/services/mobile_approvals';

export async function GET(req?: NextRequest) {
  if (req) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe') {
      const expected = process.env.WHATSAPP_VERIFY_TOKEN || 'virtual_assistant_whatsapp_verify';
      if (token === expected && challenge) {
        return new NextResponse(challenge, { status: 200 });
      }
      return NextResponse.json({ error: 'Invalid WhatsApp verification token.' }, { status: 403 });
    }
  }

  return NextResponse.json({
    status: 'active',
    webhook: 'whatsapp',
    configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const auth = SecurityAuth.verifyWhatsAppWebhook(req, rawBody);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const entries: any[] = payload.entry || [];
    const results: any[] = [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const messages: any[] = change.value?.messages || [];
        for (const msg of messages) {
          const from = String(msg.from || 'whatsapp_user');

          // 1. Interactive Button Reply (Approve / Reject)
          const buttonId = String(msg.interactive?.button_reply?.id || '');
          if (buttonId.startsWith('appr:') || buttonId.startsWith('rejt:')) {
            const approved = buttonId.startsWith('appr:');
            const token = buttonId.slice(5);
            const decision = await MobileApprovalService.processMobileDecision(token, approved);
            await OmnichannelIngestionService.dispatchWhatsAppMessage(from, decision.message);
            results.push({ type: 'interactive_approval', from, approved, token, decision });
            continue;
          }

          // 2. Standard Inbound Text Message
          const textBody = String(msg.text?.body || '').trim();
          if (textBody) {
            const response = await OmnichannelIngestionService.processInboundMessage({
              channel: 'whatsapp',
              senderId: from,
              text: textBody
            });
            results.push({ type: 'message', from, response });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'WhatsApp webhook error' },
      { status: 500 }
    );
  }
}
