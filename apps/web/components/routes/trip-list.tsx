"use client";

import type { Trip } from "@route-planner/shared";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TripCard } from "./trip-card";

interface TripListProps {
  trips: Trip[];
  selectedTripId: string | null;
  hoveredTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  onHoverTrip: (tripId: string | null) => void;
}

export function TripList({
  trips,
  selectedTripId,
  hoveredTripId,
  onSelectTrip,
  onHoverTrip,
}: TripListProps) {
  if (trips.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No trips to display. Upload a manifest to get started.
      </div>
    );
  }

  // A trip is "dimmed" when another trip is being hovered or selected,
  // but this trip is neither the hovered nor the selected one.
  const activeId = hoveredTripId ?? selectedTripId;
  const hasFocus = activeId !== null;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-1">
        {trips.map((trip) => {
          const isActive = trip.id === activeId;
          const isSelected = trip.id === selectedTripId;
          const dimmed = hasFocus && !isActive && !isSelected;

          return (
            <TripCard
              key={trip.id}
              trip={trip}
              selected={isSelected}
              dimmed={dimmed}
              onSelect={onSelectTrip}
              onHoverStart={(id) => onHoverTrip(id)}
              onHoverEnd={() => onHoverTrip(null)}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
