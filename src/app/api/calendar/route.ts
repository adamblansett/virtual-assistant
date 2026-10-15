import { NextResponse } from 'next/server';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';

export async function GET() {
  try {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const events = await adapters.calendar.listEvents({});
    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list calendar events' }, { status: 500 });
  }
}
