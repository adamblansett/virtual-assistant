import { NextRequest, NextResponse } from 'next/server';
import { ReceiptParserService } from '@/lib/services/receipt_parser';

export async function GET() {
  try {
    const receipts = ReceiptParserService.listReceipts();
    return NextResponse.json({ receipts });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to list receipts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.rawText) {
      return NextResponse.json(
        { error: 'rawText is required to parse a receipt or invoice' },
        { status: 400 }
      );
    }
    const receipt = ReceiptParserService.parseReceiptDocument(body.rawText, body.sourceFileName);
    return NextResponse.json({ success: true, receipt });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to parse receipt' },
      { status: 500 }
    );
  }
}
