import { NextRequest, NextResponse } from 'next/server';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    if (req) {
      const { searchParams } = new URL(req.url);
      const readPath = searchParams.get('path');
      if (readPath) {
        const fileData = await adapters.files.readFile(readPath);
        return NextResponse.json({ file: fileData });
      }
    }

    const files = await adapters.files.listFiles('');
    return NextResponse.json({
      baseDir: adapters.files.getBaseDir(),
      files
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list workspace files' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const filePath = (body.filePath || body.fileName || '').trim();
    const content = typeof body.content === 'string' ? body.content : '';

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required.' }, { status: 400 });
    }

    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const written = await adapters.files.writeFile(filePath, content);
    const files = await adapters.files.listFiles('');

    return NextResponse.json({
      success: true,
      written,
      baseDir: adapters.files.getBaseDir(),
      files
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to write workspace file' }, { status: 400 });
  }
}
