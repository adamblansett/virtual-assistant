import { NextRequest, NextResponse } from 'next/server';
import { ConflictDetectorService } from '@/lib/services/conflict_detector';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const report = await ConflictDetectorService.scanAllConflicts();
    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to scan executive conflicts' },
      { status: 500 }
    );
  }
}
