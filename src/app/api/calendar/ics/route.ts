import { NextRequest, NextResponse } from 'next/server';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { AppStorage } from '@/lib/storage/db';
import { IcsCalendarExporter } from '@/lib/services/ics_export';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    AppStorage.initialize();
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const events = await adapters.calendar.listEvents({
      timeMin: new Date(Date.now() - 7 * 86400000).toISOString(),
      maxResults: 100
    });
    const trips = AppStorage.listTrips();

    const icsContent = IcsCalendarExporter.generateIcsCalendar(events, trips);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="executive_calendar.ics"'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate ICS calendar export' },
      { status: 500 }
    );
  }
}
