import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuth } from '@/lib/security/auth';
import { OmnichannelIngestionService } from '@/lib/services/omnichannel';
import { MobileApprovalService } from '@/lib/services/mobile_approvals';

export async function GET() {
  return NextResponse.json({
    status: 'active',
    webhook: 'slack',
    configured: Boolean(process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN)
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const auth = SecurityAuth.verifySlackWebhook(req, rawBody);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');

    // 1. Slack URL verification handshake
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge });
    }

    // 2. Slack Interactive Block Actions (Approve / Reject button callbacks)
    if (payload.type === 'block_actions' && Array.isArray(payload.actions)) {
      const actionVal = String(payload.actions[0]?.value || '');
      const channelId = payload.channel?.id || payload.user?.id || '#executive';
      if (actionVal.startsWith('appr:') || actionVal.startsWith('rejt:')) {
        const approved = actionVal.startsWith('appr:');
        const token = actionVal.slice(5);
        const decision = await MobileApprovalService.processMobileDecision(token, approved);
        await OmnichannelIngestionService.dispatchSlackMessage(channelId, decision.message);
        return NextResponse.json({
          ok: true,
          type: 'block_actions',
          approved,
          token,
          decision
        });
      }
    }

    // 3. Slack Event Callback (message / app_mention)
    if (payload.type === 'event_callback' && payload.event) {
      const evt = payload.event;
      if (evt.bot_id) {
        return NextResponse.json({ ok: true, ignored: 'bot_message' });
      }
      const text = String(evt.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
      const channelId = String(evt.channel || evt.user || '#general');

      const response = await OmnichannelIngestionService.processInboundMessage({
        channel: 'slack',
        senderId: channelId,
        text
      });

      return NextResponse.json({
        ok: true,
        type: 'event_callback',
        response
      });
    }

    return NextResponse.json({ ok: true, handled: false });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Slack webhook error' },
      { status: 500 }
    );
  }
}
