import { NextRequest, NextResponse } from 'next/server';
import { SchedulingCoordinatorService } from '@/lib/services/scheduling_coordinator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await SchedulingCoordinatorService.coordinateMeeting(body);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to coordinate meeting' },
      { status: 500 }
    );
  }
}
