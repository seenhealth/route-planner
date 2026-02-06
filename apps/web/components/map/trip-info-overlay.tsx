"use client";

import type { Trip } from "@route-planner/shared";
import { InfoWindow } from "@vis.gl/react-google-maps";

interface TripInfoOverlayProps {
  trip: Trip;
  /** Position for the info window (center of the route) */
  position: { lat: number; lng: number };
}

function computeTotalDuration(trip: Trip): string {
  if (!trip.directions || trip.directions.legs.length === 0) return "N/A";
  // Sum all leg durations — they are strings like "12 mins", "1 hour 5 mins"
  let totalSeconds = 0;
  for (const leg of trip.directions.legs) {
    const dur = leg.duration;
    const hourMatch = dur.match(/(\d+)\s*hour/);
    const minMatch = dur.match(/(\d+)\s*min/);
    if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
    if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
  }
  if (totalSeconds === 0) return trip.directions.legs[trip.directions.legs.length - 1].duration;
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

function computeTotalDistance(trip: Trip): string {
  if (!trip.directions || trip.directions.legs.length === 0) return "N/A";
  let totalMeters = 0;
  for (const leg of trip.directions.legs) {
    const dist = leg.distance;
    const miMatch = dist.match(/([\d.]+)\s*mi/);
    const kmMatch = dist.match(/([\d.]+)\s*km/);
    if (miMatch) totalMeters += parseFloat(miMatch[1]) * 1609.34;
    if (kmMatch) totalMeters += parseFloat(kmMatch[1]) * 1000;
  }
  if (totalMeters === 0) return trip.directions.legs[trip.directions.legs.length - 1].distance;
  const miles = totalMeters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

export function TripInfoOverlay({ trip, position }: TripInfoOverlayProps) {
  return (
    <InfoWindow
      position={position}
      pixelOffset={[0, -8]}
      headerDisabled
      shouldFocus={false}
    >
      <div style={{ minWidth: 180, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: trip.color,
              flexShrink: 0,
            }}
          />
          <strong style={{ fontSize: 13 }}>{trip.area}</strong>
          <span
            style={{
              fontSize: 11,
              backgroundColor: trip.type === "pickup" ? "#dbeafe" : "#f3e8ff",
              color: trip.type === "pickup" ? "#1d4ed8" : "#7c3aed",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            {trip.type}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
          <div>
            <span style={{ color: "#888" }}>Passengers:</span>{" "}
            {trip.passengerCount}
          </div>
          <div>
            <span style={{ color: "#888" }}>Duration:</span>{" "}
            {computeTotalDuration(trip)}
          </div>
          <div>
            <span style={{ color: "#888" }}>Distance:</span>{" "}
            {computeTotalDistance(trip)}
          </div>
        </div>
      </div>
    </InfoWindow>
  );
}

/** Compute the midpoint of a trip's passengers for the info window position */
export function getTripMidpoint(trip: Trip): { lat: number; lng: number } {
  const validPassengers = trip.passengers.filter((p) => p.lat !== 0 && p.lng !== 0);
  if (validPassengers.length === 0) {
    return { lat: 34.0823, lng: -118.1622 }; // Hub fallback
  }
  const mid = Math.floor(validPassengers.length / 2);
  return { lat: validPassengers[mid].lat, lng: validPassengers[mid].lng };
}
