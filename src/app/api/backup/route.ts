import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req?: NextRequest) {
  const auth = SecurityAuth.verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
  }

  AppStorage.initialize();
  const snapshot = AppStorage.exportSnapshot();
  return NextResponse.json({
    snapshot
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const payload = body.snapshot || body;
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid backup snapshot payload.' }, { status: 400 });
    }

    const result = AppStorage.importSnapshot(payload);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to restore backup.' }, { status: 400 });
  }
}
