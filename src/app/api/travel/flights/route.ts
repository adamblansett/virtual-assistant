import { NextRequest, NextResponse } from 'next/server';
import { FlightTrackerService } from '@/lib/services/flight_tracker';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const flightNumber = searchParams.get('flightNumber') || 'DL 428';
    const status = await FlightTrackerService.trackFlight(flightNumber);
    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to track flight' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const flightNumber = body.flightNumber || 'DL 428';
    const status = await FlightTrackerService.trackFlight(flightNumber);
    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to track flight' },
      { status: 500 }
    );
  }
}
