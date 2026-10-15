import { NextRequest, NextResponse } from 'next/server';
import { TravelItineraryService } from '@/lib/services/travel';

export async function GET() {
  try {
    const trips = TravelItineraryService.listTrips();
    return NextResponse.json({ trips });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list travel itineraries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'extract') {
      const result = await TravelItineraryService.extractReservationsFromInbox();
      return NextResponse.json({ success: true, result });
    }

    const trip = await TravelItineraryService.createTripItinerary(body);
    return NextResponse.json({ success: true, trip });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process travel request' }, { status: 500 });
  }
}
