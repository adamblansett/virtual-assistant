import { NextRequest, NextResponse } from 'next/server';
import { MobileApprovalService } from '@/lib/services/mobile_approvals';
import { AppStorage } from '@/lib/storage/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const approval = AppStorage.getMobileApproval(token);
    if (!approval) {
      return NextResponse.json({ error: 'Approval token not found' }, { status: 404 });
    }

    const plan = AppStorage.getPlan(approval.planId);
    return NextResponse.json({ approval, plan });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch mobile approval' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, approved } = body;
    if (!token || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'token and approved (boolean) are required' },
        { status: 400 }
      );
    }

    const result = await MobileApprovalService.processMobileDecision(token, approved);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process mobile approval' },
      { status: 500 }
    );
  }
}
