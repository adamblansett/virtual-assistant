import { describe, it, expect, beforeEach } from 'vitest';
import { TravelItineraryService } from '@/lib/services/travel';
import { AppStorage } from '@/lib/storage/db';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { ToolRegistry } from '@/lib/tools/registry';

describe('Executive Travel & Itinerary Service', () => {
  beforeEach(() => {
    AppStorage.reset();
    WorkflowExecutionEngine.reset();
  });

  it('lists existing executive trips with flights and hotel reservations', () => {
    const trips = TravelItineraryService.listTrips();
    expect(trips.length).toBeGreaterThanOrEqual(1);

    const trip = trips[0];
    expect(trip.destination).toContain('New York');
    expect(trip.flights.length).toBeGreaterThanOrEqual(1);
    expect(trip.hotel).toBeDefined();
    expect(trip.hotel?.hotelName).toBeDefined();
    expect(trip.packingTips.length).toBeGreaterThan(0);
  });

  it('extracts flight and hotel reservations from inbox messages', async () => {
    const res = await TravelItineraryService.extractReservationsFromInbox();
    expect(res).toBeDefined();
    expect(res.flightsFound.length).toBeGreaterThanOrEqual(1);
    expect(res.hotelsFound.length).toBeGreaterThanOrEqual(1);
    expect(res.tripsUpdated).toBeGreaterThanOrEqual(1);
  });

  it('creates a new trip itinerary and syncs flight schedule to the executive calendar', async () => {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const initialEvents = await adapters.calendar.listEvents({});

    const newTrip = await TravelItineraryService.createTripItinerary({
      destination: 'London, UK',
      purpose: 'Global Fintech Symposium & UK Investor Meetings',
      startDate: '2026-11-10',
      endDate: '2026-11-14',
      flights: [
        {
          confirmationCode: 'BA-77192',
          airline: 'British Airways',
          flightNumber: 'BA 212',
          departureAirport: 'BOS',
          arrivalAirport: 'LHR',
          departureTime: '2026-11-10T19:00:00Z',
          arrivalTime: '2026-11-11T06:30:00Z',
          seat: '4K',
          status: 'confirmed'
        }
      ],
      hotel: {
        confirmationCode: 'CLAR-991',
        hotelName: 'Claridge\'s Mayfair',
        address: 'Brook St, London W1K 4HR, UK',
        checkInDate: '2026-11-11',
        checkOutDate: '2026-11-14',
        roomType: 'Mayfair Suite',
        status: 'confirmed'
      }
    });

    expect(newTrip.destination).toBe('London, UK');
    expect(AppStorage.getTrip(newTrip.id)).toBeDefined();

    // Verify calendar sync
    const updatedEvents = await adapters.calendar.listEvents({});
    expect(updatedEvents.length).toBeGreaterThan(initialEvents.length);
    expect(updatedEvents.some(e => e.summary.includes('British Airways'))).toBe(true);
  });

  it('executes travel tools via ToolRegistry', async () => {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();

    // 1. Tool travel_list_trips
    const listRes = await ToolRegistry.executeTool('travel_list_trips', {}, adapters);
    expect(Array.isArray(listRes)).toBe(true);

    // 2. Tool travel_extract_reservations
    const extractRes = await ToolRegistry.executeTool('travel_extract_reservations', {}, adapters);
    expect(extractRes.flightsFound.length).toBeGreaterThan(0);

    // 3. Tool travel_create_itinerary
    const createRes = await ToolRegistry.executeTool(
      'travel_create_itinerary',
      {
        destination: 'Chicago, IL',
        purpose: 'Midwest Partner Summit'
      },
      adapters
    );
    expect(createRes.destination).toBe('Chicago, IL');
  });
});
