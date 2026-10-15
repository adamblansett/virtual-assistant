import { NextRequest, NextResponse } from 'next/server';
import { AssistantAutomationService } from '@/lib/services/automation';
import { AppStorage } from '@/lib/storage/db';
import { AssistantRoutineType } from '@/types';

export async function GET() {
  try {
    const routines = AppStorage.listRoutineResults();
    return NextResponse.json({ routines });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list routine history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const routineType = body.routineType as AssistantRoutineType;

    if (!routineType || !['morning_briefing', 'evening_wrapup', 'weekly_audit'].includes(routineType)) {
      return NextResponse.json({ error: 'Valid routineType is required (morning_briefing, evening_wrapup, weekly_audit).' }, { status: 400 });
    }

    const result = await AssistantAutomationService.runRoutine(routineType);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to execute routine' }, { status: 500 });
  }
}
