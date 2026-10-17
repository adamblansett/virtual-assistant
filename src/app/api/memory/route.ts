import { NextRequest, NextResponse } from 'next/server';
import { MemoryService } from '@/lib/services/memory';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req: NextRequest) {
  const auth = SecurityAuth.verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') as any;

  const memories = query || category
    ? MemoryService.recallFacts(query, category)
    : MemoryService.listAllFacts();

  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  const auth = SecurityAuth.verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body.action === 'delete' && body.id) {
      const deleted = MemoryService.forgetFact(body.id);
      return NextResponse.json({ deleted, memories: MemoryService.listAllFacts() });
    }

    if (!body.fact || typeof body.fact !== 'string') {
      return NextResponse.json({ error: 'Memory fact text is required.' }, { status: 400 });
    }

    const memory = MemoryService.rememberFact(body.fact, body.category || 'general', body.source || 'user');
    return NextResponse.json({ memory, memories: MemoryService.listAllFacts() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save memory' }, { status: 500 });
  }
}
