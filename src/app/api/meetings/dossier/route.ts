import { NextRequest, NextResponse } from 'next/server';
import { MeetingPrepService } from '@/lib/services/meeting_prep';
import { AppStorage } from '@/lib/storage/db';

export async function GET(req: NextRequest) {
  try {
    const meetingId = req.nextUrl.searchParams.get('meetingId');
    if (meetingId) {
      const existing = AppStorage.getMeetingDossier(meetingId);
      if (existing) {
        return NextResponse.json({ dossier: existing });
      }
      const dossier = await MeetingPrepService.prepareMeetingDossier(meetingId);
      return NextResponse.json({ dossier });
    }
    const dossiers = AppStorage.listMeetingDossiers();
    return NextResponse.json({ dossiers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retrieve meeting dossier' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'process_notes') {
      if (!body.meetingTitle || !body.rawNotes) {
        return NextResponse.json({ error: 'meetingTitle and rawNotes are required.' }, { status: 400 });
      }
      const result = await MeetingPrepService.processMeetingNotes(
        body.meetingTitle,
        body.rawNotes,
        body.attendees || []
      );
      return NextResponse.json({ success: true, result });
    }

    if (body.meetingId) {
      const dossier = await MeetingPrepService.prepareMeetingDossier(body.meetingId);
      return NextResponse.json({ success: true, dossier });
    }

    return NextResponse.json({ error: 'Invalid meeting request parameters.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process meeting request' }, { status: 500 });
  }
}
