import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuth } from '@/lib/security/auth';
import { ConflictResolverService } from '@/lib/services/conflict_resolver';

export async function POST(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = req ? await req.json().catch(() => ({})) : {};
    const { conflictId, resolveAll } = body;

    if (resolveAll) {
      const result = await ConflictResolverService.resolveAllConflicts();
      return NextResponse.json({
        success: true,
        totalResolved: result.totalResolved,
        results: result.results
      });
    }

    if (!conflictId) {
      return NextResponse.json(
        { error: 'Missing required "conflictId" parameter or set "resolveAll: true"' },
        { status: 400 }
      );
    }

    const resolution = await ConflictResolverService.resolveConflict(conflictId);
    return NextResponse.json({
      success: resolution.resolved,
      resolution
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed resolving conflict' },
      { status: 500 }
    );
  }
}
