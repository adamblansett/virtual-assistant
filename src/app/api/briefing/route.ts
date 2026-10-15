import { NextResponse } from 'next/server';
import { ExecutiveBriefingService } from '@/lib/services/briefing';

export async function GET() {
  try {
    const briefing = await ExecutiveBriefingService.generateBriefing();
    return NextResponse.json({ briefing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate executive briefing' }, { status: 500 });
  }
}
