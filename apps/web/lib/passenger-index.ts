import type { RouteData, Trip } from "@route-planner/shared";

export interface PassengerTripInfo {
  tripId: string;
  area: string;
  color: string;
  type: "pickup" | "dropoff";
  stopIndex: number;
  /** Other passengers on the same trip */
  coPassengers: string[];
}

export interface PassengerInfo {
  name: string;
  address: string;
  destAddress: string;
  time: string;
  phone: string;
  purpose: string;
  notes: string;
  assistiveDevice: string;
  pickupTrip: PassengerTripInfo | null;
  dropoffTrip: PassengerTripInfo | null;
  lat: number;
  lng: number;
  destLat: number;
  destLng: number;
}

/**
 * Build a passenger index from route data, matching passengers across
 * pickup and dropoff trips by name (exact match).
 */
export function buildPassengerIndex(routeData: RouteData): PassengerInfo[] {
  const map = new Map<string, PassengerInfo>();

  function processTripList(trips: Trip[]) {
    for (const trip of trips) {
      const otherNames = trip.passengers.map((p) => p.name);
      for (let i = 0; i < trip.passengers.length; i++) {
        const p = trip.passengers[i];
        const key = p.name;
        if (!key) continue;

        const tripInfo: PassengerTripInfo = {
          tripId: trip.id,
          area: trip.area,
          color: trip.color,
          type: trip.type,
          stopIndex: i,
          coPassengers: otherNames.filter((n) => n !== p.name),
        };

        let entry = map.get(key);
        if (!entry) {
          entry = {
            name: p.name,
            address: p.address,
            destAddress: p.destAddress,
            time: p.time,
            phone: p.phone,
            purpose: p.purpose,
            notes: p.notes,
            assistiveDevice: p.assistiveDevice,
            pickupTrip: null,
            dropoffTrip: null,
            lat: p.lat,
            lng: p.lng,
            destLat: p.destLat,
            destLng: p.destLng,
          };
          map.set(key, entry);
        }

        if (trip.type === "pickup") {
          entry.pickupTrip = tripInfo;
          // Use pickup address as primary if available
          if (p.address) entry.address = p.address;
          if (p.lat && p.lng) {
            entry.lat = p.lat;
            entry.lng = p.lng;
          }
        } else {
          entry.dropoffTrip = tripInfo;
          if (p.destAddress) entry.destAddress = p.destAddress;
          if (p.destLat && p.destLng) {
            entry.destLat = p.destLat;
            entry.destLng = p.destLng;
          }
        }

        // Prefer non-empty values
        if (p.time && !entry.time) entry.time = p.time;
        if (p.phone && !entry.phone) entry.phone = p.phone;
        if (p.purpose && !entry.purpose) entry.purpose = p.purpose;
        if (p.notes && !entry.notes) entry.notes = p.notes;
        if (p.assistiveDevice && !entry.assistiveDevice) entry.assistiveDevice = p.assistiveDevice;
      }
    }
  }

  processTripList(routeData.pickupTrips);
  processTripList(routeData.dropoffTrips);

  // Sort alphabetically by name
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}
