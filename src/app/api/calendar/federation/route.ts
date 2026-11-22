import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuth } from '@/lib/security/auth';
import { AppStorage } from '@/lib/storage/db';
import { MultiCalendarFederationService } from '@/lib/services/multi_calendar';

export async function GET(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    AppStorage.initialize();
    const calendars = AppStorage.listFederatedCalendars();
    const busyBlocks = AppStorage.listFederatedBusyBlocks();

    return NextResponse.json({
      success: true,
      calendars,
      busyBlocks
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed listing federated calendars' },
      { status: 500 }
    );
  }
}

export async function POST(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = req ? await req.json().catch(() => ({})) : {};
    const action = body.action || 'sync';

    if (action === 'sync') {
      const result = await MultiCalendarFederationService.syncBusyBlocks();
      return NextResponse.json({
        success: true,
        ...result
      });
    }

    if (action === 'clear') {
      const result = await MultiCalendarFederationService.clearFederatedBlocks();
      return NextResponse.json({
        success: true,
        ...result
      });
    }

    if (action === 'configure' && body.calendar) {
      AppStorage.saveFederatedCalendar(body.calendar);
      return NextResponse.json({
        success: true,
        calendar: body.calendar
      });
    }

    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed processing calendar federation action' },
      { status: 500 }
    );
  }
}
