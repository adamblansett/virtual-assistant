import { NextResponse } from 'next/server';
import { AuditLogger } from '@/lib/audit/logger';

export async function GET() {
  const events = AuditLogger.getEvents(100);
  return NextResponse.json({ events });
}
