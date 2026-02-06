"use client";

import type { Passenger } from "@route-planner/shared";

interface PassengerInfoProps {
  passenger: Passenger;
  tripArea: string;
  tripColor: string;
  tripType: "pickup" | "dropoff";
  stopNumber: number;
}

export function PassengerInfo({
  passenger,
  tripArea,
  tripColor,
  tripType,
  stopNumber,
}: PassengerInfoProps) {
  return (
    <div style={{ minWidth: 200, maxWidth: 280, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: tripColor,
            flexShrink: 0,
          }}
        />
        <strong style={{ fontSize: 14 }}>{passenger.name}</strong>
      </div>
      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#888" }}>Address:</span>{" "}
          {passenger.address}
        </div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#888" }}>Trip:</span>{" "}
          {tripArea} ({tripType})
        </div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#888" }}>Stop:</span>{" "}
          #{stopNumber}
        </div>
        {passenger.time && (
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: "#888" }}>Scheduled:</span>{" "}
            {passenger.time}
          </div>
        )}
        {passenger.phone && (
          <div>
            <span style={{ color: "#888" }}>Phone:</span>{" "}
            {passenger.phone}
          </div>
        )}
        {passenger.purpose && (
          <div>
            <span style={{ color: "#888" }}>Purpose:</span>{" "}
            {passenger.purpose}
          </div>
        )}
        {passenger.assistiveDevice && (
          <div>
            <span style={{ color: "#888" }}>Assistive Device:</span>{" "}
            {passenger.assistiveDevice}
          </div>
        )}
        {passenger.notes && (
          <div style={{ marginTop: 4, padding: "4px 6px", backgroundColor: "#f5f5f0", borderRadius: 4 }}>
            <span style={{ color: "#888" }}>Notes:</span>{" "}
            {passenger.notes}
          </div>
        )}
      </div>
    </div>
  );
}
