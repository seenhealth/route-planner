import { NextResponse } from "next/server";

export async function GET() {
  // Stub: will be implemented by the routing agent
  return NextResponse.json({
    generated: "",
    totalPassengers: 0,
    hub: { name: "", address: "", lat: 0, lng: 0 },
    pickupTrips: [],
    dropoffTrips: [],
  });
}
