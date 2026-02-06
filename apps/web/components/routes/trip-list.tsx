"use client";

import type { Trip } from "@route-planner/shared";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TripCard } from "./trip-card";

interface TripListProps {
  trips: Trip[];
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
}

export function TripList({ trips, selectedTripId, onSelectTrip }: TripListProps) {
  if (trips.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No trips to display. Upload a manifest to get started.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-1">
        {trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            selected={trip.id === selectedTripId}
            onSelect={onSelectTrip}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
