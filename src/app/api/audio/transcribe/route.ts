import { NextRequest, NextResponse } from 'next/server';
import { OmnichannelIngestionService } from '@/lib/services/omnichannel';
import { SecurityAuth } from '@/lib/security/auth';

export async function POST(req: NextRequest) {
  const auth = SecurityAuth.verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { audioBase64, mimeType, audioUrl } = body;

    if (audioBase64) {
      const result = await OmnichannelIngestionService.transcribeAudioPayload(
        audioBase64,
        mimeType || 'audio/webm'
      );
      return NextResponse.json(result);
    }

    const transcript = await OmnichannelIngestionService.transcribeVoiceNote(audioUrl || 'voice_memo.webm');
    return NextResponse.json({ transcript, provider: 'fallback' });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Audio transcription failed' },
      { status: 500 }
    );
  }
}
