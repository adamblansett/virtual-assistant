import { NextRequest, NextResponse } from 'next/server';
import { JobManager } from '@/lib/jobs/queue';
import { AppStorage } from '@/lib/storage/db';

export async function GET() {
  JobManager.initialize();
  const jobs = JobManager.listJobs();
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'planId is required.' }, { status: 400 });
    }

    AppStorage.initialize();
    const plan = AppStorage.getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: `Plan with ID ${planId} not found.` }, { status: 404 });
    }

    JobManager.initialize();
    const job = JobManager.enqueueJob(plan);
    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
