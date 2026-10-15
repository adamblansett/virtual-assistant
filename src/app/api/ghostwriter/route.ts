import { NextRequest, NextResponse } from 'next/server';
import { ExecutiveGhostwriterService } from '@/lib/services/ghostwriter';
import { AppStorage } from '@/lib/storage/db';

export async function GET() {
  try {
    const profile = AppStorage.getVoiceProfile();
    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch voice profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'update_profile') {
      const updated = AppStorage.saveVoiceProfile(body.profile);
      return NextResponse.json({ success: true, profile: updated });
    }

    const result = await ExecutiveGhostwriterService.ghostwriteReply(body);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to ghostwrite reply' }, { status: 500 });
  }
}
