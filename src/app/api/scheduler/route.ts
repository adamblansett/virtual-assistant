import { NextRequest, NextResponse } from 'next/server';
import { BackgroundSchedulerService } from '@/lib/services/scheduler';
import { AppStorage } from '@/lib/storage/db';

export async function GET() {
  try {
    const jobs = AppStorage.listScheduledJobs();
    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list scheduled jobs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'evaluate';

    if (action === 'evaluate') {
      const result = await BackgroundSchedulerService.evaluateAndRunDueJobs();
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'trigger' && body.id) {
      const result = await BackgroundSchedulerService.triggerJob(body.id);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'toggle' && body.id) {
      const job = BackgroundSchedulerService.toggleJob(body.id);
      return NextResponse.json({ success: true, job });
    }

    if (action === 'save' && body.job) {
      const saved = AppStorage.saveScheduledJob(body.job);
      return NextResponse.json({ success: true, job: saved });
    }

    return NextResponse.json({ error: 'Unknown scheduler action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process scheduler action' },
      { status: 500 }
    );
  }
}
