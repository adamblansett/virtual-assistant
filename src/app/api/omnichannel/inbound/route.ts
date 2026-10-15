import { NextRequest, NextResponse } from 'next/server';
import { OmnichannelIngestionService } from '@/lib/services/omnichannel';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.channel || !body.senderId) {
      return NextResponse.json(
        { error: 'channel and senderId are required fields' },
        { status: 400 }
      );
    }
    const response = await OmnichannelIngestionService.processInboundMessage(body);
    return NextResponse.json({ success: true, response });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process omnichannel message' },
      { status: 500 }
    );
  }
}
