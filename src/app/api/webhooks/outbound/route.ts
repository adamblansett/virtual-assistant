import { NextRequest, NextResponse } from 'next/server';
import { OutboundWebhookBus } from '@/lib/services/webhook_bus';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req?: NextRequest) {
  const auth = SecurityAuth.verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
  }

  const subscriptions = OutboundWebhookBus.listSubscriptions().map(s => ({
    ...s,
    secret: SecurityAuth.maskSecret(s.secret)
  }));
  const deliveries = OutboundWebhookBus.getDeliveryLog();

  return NextResponse.json({ subscriptions, deliveries });
}

export async function POST(req: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await req.json();

    if (body.action === 'delete' && body.id) {
      const deleted = OutboundWebhookBus.deleteSubscription(body.id);
      return NextResponse.json({
        deleted,
        subscriptions: OutboundWebhookBus.listSubscriptions()
      });
    }

    if (body.action === 'emit') {
      const records = await OutboundWebhookBus.emitEvent(
        body.eventType || 'plan.succeeded',
        body.data || { message: 'Manual test webhook dispatch' }
      );
      return NextResponse.json({ deliveredCount: records.length, records });
    }

    if (!body.name || !body.targetUrl) {
      return NextResponse.json({ error: 'name and targetUrl are required.' }, { status: 400 });
    }

    const sub = OutboundWebhookBus.registerSubscription({
      id: body.id,
      name: body.name,
      targetUrl: body.targetUrl,
      events: body.events,
      secret: body.secret,
      enabled: body.enabled ?? true
    });

    return NextResponse.json({
      subscription: {
        ...sub,
        secret: SecurityAuth.maskSecret(sub.secret)
      },
      subscriptions: OutboundWebhookBus.listSubscriptions().map(s => ({
        ...s,
        secret: SecurityAuth.maskSecret(s.secret)
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Outbound webhook operation failed.' }, { status: 400 });
  }
}
