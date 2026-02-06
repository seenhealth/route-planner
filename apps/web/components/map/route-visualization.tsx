"use client";

import { useMemo } from "react";
import type { Trip } from "@route-planner/shared";
import { RoutePolyline } from "./route-polyline";
import { StopMarker } from "./stop-marker";
import { PassengerInfo } from "./passenger-info";
import { TripInfoOverlay, getTripMidpoint } from "./trip-info-overlay";

interface RouteVisualizationProps {
  trips: Trip[];
  hoveredTripId: string | null;
  selectedTripId: string | null;
  hoveredPassengerKey: string | null;
  selectedPassengerKey: string | null;
  onHoverTrip: (tripId: string | null) => void;
  onSelectTrip: (tripId: string) => void;
  onHoverPassenger: (key: string | null) => void;
  onSelectPassenger: (key: string | null) => void;
}

export function RouteVisualization({
  trips,
  hoveredTripId,
  selectedTripId,
  hoveredPassengerKey,
  selectedPassengerKey,
  onHoverTrip,
  onSelectTrip,
  onHoverPassenger,
  onSelectPassenger,
}: RouteVisualizationProps) {
  // Determine which trip is "active" (hovered takes priority over selected)
  const activeTripId = hoveredTripId ?? selectedTripId;
  const hasActiveFocus = activeTripId !== null;

  // The trip being hovered from the polyline (for info overlay)
  const polylineHoveredTrip = useMemo(() => {
    if (!hoveredTripId) return null;
    return trips.find((t) => t.id === hoveredTripId) ?? null;
  }, [hoveredTripId, trips]);

  // Determine which trips should show passenger markers.
  // Show markers for: the hovered trip, the selected trip, or all if nothing is focused.
  const tripsWithMarkers = useMemo(() => {
    if (hasActiveFocus) {
      return trips.filter(
        (t) => t.id === hoveredTripId || t.id === selectedTripId
      );
    }
    // When nothing is focused, show markers for selected trip only (or none)
    if (selectedTripId) {
      return trips.filter((t) => t.id === selectedTripId);
    }
    return [];
  }, [trips, hoveredTripId, selectedTripId, hasActiveFocus]);

  return (
    <>
      {/* Polylines for all trips */}
      {trips.map((trip) => {
        if (!trip.directions?.overviewPolyline) return null;

        const isActive = trip.id === activeTripId;
        const isSelected = trip.id === selectedTripId;
        const emphasized = isActive || isSelected;

        // Calculate visual properties
        let strokeWeight = 3;
        let strokeOpacity = 0.7;

        if (hasActiveFocus) {
          if (emphasized) {
            strokeWeight = 6;
            strokeOpacity = 0.9;
          } else {
            strokeWeight = 2;
            strokeOpacity = 0.2;
          }
        }

        return (
          <RoutePolyline
            key={trip.id}
            encodedPath={trip.directions.overviewPolyline}
            color={trip.color}
            strokeWeight={strokeWeight}
            strokeOpacity={strokeOpacity}
            tripId={trip.id}
            onHover={onHoverTrip}
            onClick={onSelectTrip}
          />
        );
      })}

      {/* Passenger markers for active/selected trips */}
      {tripsWithMarkers.map((trip) =>
        trip.passengers
          .filter((p) => p.lat !== 0 && p.lng !== 0)
          .map((passenger, i) => {
            const passengerKey = `${trip.id}-${i}`;
            const isHovered = passengerKey === hoveredPassengerKey;
            const isSelected = passengerKey === selectedPassengerKey;
            const isTripActive = trip.id === activeTripId;

            return (
              <StopMarker
                key={passengerKey}
                lat={passenger.lat}
                lng={passenger.lng}
                label={String(i + 1)}
                color={trip.color}
                scale={isHovered || isSelected ? 1.15 : 1}
                zIndex={isHovered || isSelected ? 100 : isTripActive ? 10 : 1}
                onClick={() => onSelectPassenger(passengerKey)}
                onHover={(hovered) =>
                  onHoverPassenger(hovered ? passengerKey : null)
                }
                showInfo={isSelected}
                infoContent={
                  <PassengerInfo
                    passenger={passenger}
                    tripArea={trip.area}
                    tripColor={trip.color}
                    tripType={trip.type}
                    stopNumber={i + 1}
                  />
                }
              />
            );
          })
      )}

      {/* Trip info overlay on polyline hover (only if hovering from polyline, not from sidebar) */}
      {polylineHoveredTrip &&
        hoveredTripId &&
        hoveredTripId !== selectedTripId && (
          <TripInfoOverlay
            trip={polylineHoveredTrip}
            position={getTripMidpoint(polylineHoveredTrip)}
          />
        )}
    </>
  );
}
