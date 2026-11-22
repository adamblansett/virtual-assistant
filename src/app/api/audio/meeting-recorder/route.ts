import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuth } from '@/lib/security/auth';
import { MeetingAudioService } from '@/lib/services/meeting_audio';

export async function POST(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = req ? await req.json().catch(() => ({})) : {};
    const { meetingTitle, transcript, audioBase64, attendees } = body;

    const result = await MeetingAudioService.processMeetingRecord({
      meetingTitle: meetingTitle || 'Executive Sync',
      transcript,
      audioBase64,
      attendees
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed processing meeting audio/transcript' },
      { status: 500 }
    );
  }
}
