import { NextRequest, NextResponse } from 'next/server';
import { CloudDriveSyncService } from '@/lib/services/drive_sync';
import { AppStorage } from '@/lib/storage/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    
    if (query) {
      const results = CloudDriveSyncService.searchDocuments(query);
      return NextResponse.json({ documents: results });
    }

    const documents = CloudDriveSyncService.listDocuments();
    return NextResponse.json({ documents });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'summarize') {
      const summary = CloudDriveSyncService.summarizeDocument(body.query || body.id);
      return NextResponse.json({ success: true, summary });
    }

    if (body.action === 'save' && body.document) {
      const saved = AppStorage.saveDocument(body.document);
      return NextResponse.json({ success: true, document: saved });
    }

    return NextResponse.json({ error: 'Invalid document action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process document request' },
      { status: 500 }
    );
  }
}
