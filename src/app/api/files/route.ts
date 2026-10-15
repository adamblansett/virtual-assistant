import { NextResponse } from 'next/server';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';

export async function GET() {
  try {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const files = await adapters.files.listFiles('');
    return NextResponse.json({
      baseDir: adapters.files.getBaseDir(),
      files
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list workspace files' }, { status: 500 });
  }
}
