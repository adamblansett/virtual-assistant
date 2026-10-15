import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';

export async function GET() {
  AppStorage.initialize();
  const preferences = AppStorage.getPreferences();
  return NextResponse.json({ preferences });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    AppStorage.initialize();
    const updated = AppStorage.updatePreferences(body);
    return NextResponse.json({ preferences: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
