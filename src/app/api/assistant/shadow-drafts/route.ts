import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuth } from '@/lib/security/auth';
import { AppStorage } from '@/lib/storage/db';
import { ShadowDraftService } from '@/lib/services/shadow_drafts';

export async function GET(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    AppStorage.initialize();
    const drafts = AppStorage.listShadowDrafts();
    return NextResponse.json({
      success: true,
      count: drafts.length,
      drafts
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed listing shadow drafts' },
      { status: 500 }
    );
  }
}

export async function POST(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = req ? await req.json().catch(() => ({})) : {};
    const action = body.action || 'scan_and_generate';

    if (action === 'scan_and_generate') {
      const result = await ShadowDraftService.scanAndGenerateShadowDrafts();
      return NextResponse.json({
        success: true,
        ...result
      });
    }

    if (action === 'send') {
      if (!body.draftId) {
        return NextResponse.json({ error: 'Missing "draftId"' }, { status: 400 });
      }
      const sendRes = await ShadowDraftService.approveAndSendDraft(body.draftId);
      return NextResponse.json(sendRes);
    }

    if (action === 'revise') {
      if (!body.draftId || !body.revisedBody) {
        return NextResponse.json({ error: 'Missing "draftId" or "revisedBody"' }, { status: 400 });
      }
      const revRes = ShadowDraftService.reviseDraft(body.draftId, body.revisedBody);
      return NextResponse.json(revRes);
    }

    if (action === 'discard') {
      if (!body.draftId) {
        return NextResponse.json({ error: 'Missing "draftId"' }, { status: 400 });
      }
      const discRes = ShadowDraftService.discardDraft(body.draftId);
      return NextResponse.json(discRes);
    }

    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed processing shadow draft action' },
      { status: 500 }
    );
  }
}
