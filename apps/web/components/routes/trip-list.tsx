"use client";

import { useMemo, useState } from "react";
import type { Trip } from "@route-planner/shared";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TripCard } from "./trip-card";
import { getEarliestTimeMinutes, getTripDurationSeconds } from "@/lib/trip-utils";
import { ArrowUpDown } from "lucide-react";

type SortMode = "default" | "startTime" | "duration";
type TimeBand = "all" | "morning" | "midday" | "afternoon";

interface TripListProps {
  trips: Trip[];
  selectedTripId: string | null;
  hoveredTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  onHoverTrip: (tripId: string | null) => void;
}

function getTimeBand(minutes: number): "morning" | "midday" | "afternoon" {
  if (minutes <= 600) return "morning"; // <= 10:00 AM
  if (minutes <= 780) return "midday"; // <= 1:00 PM
  return "afternoon";
}

export function TripList({
  trips,
  selectedTripId,
  hoveredTripId,
  onSelectTrip,
  onHoverTrip,
}: TripListProps) {
  const [sortMode, setSortMode] = useState<SortMode>("startTime");
  const [timeBand, setTimeBand] = useState<TimeBand>("all");

  const filteredAndSorted = useMemo(() => {
    let result = [...trips];

    // Filter by time band
    if (timeBand !== "all") {
      result = result.filter((trip) => {
        const min = getEarliestTimeMinutes(trip);
        if (min === Infinity) return false;
        return getTimeBand(min) === timeBand;
      });
    }

    // Sort
    if (sortMode === "startTime") {
      result.sort((a, b) => getEarliestTimeMinutes(a) - getEarliestTimeMinutes(b));
    } else if (sortMode === "duration") {
      result.sort((a, b) => getTripDurationSeconds(a) - getTripDurationSeconds(b));
    }

    return result;
  }, [trips, sortMode, timeBand]);

  if (trips.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        No trips to display. Upload a manifest to get started.
      </div>
    );
  }

  // Count trips per time band for badges
  const bandCounts = useMemo(() => {
    const counts = { morning: 0, midday: 0, afternoon: 0 };
    for (const trip of trips) {
      const min = getEarliestTimeMinutes(trip);
      if (min === Infinity) continue;
      const band = getTimeBand(min);
      counts[band]++;
    }
    return counts;
  }, [trips]);

  const activeId = hoveredTripId ?? selectedTripId;
  const hasFocus = activeId !== null;

  return (
    <div className="flex h-full flex-col">
      {/* Sort & time band controls — single row */}
      <div className="border-b px-2 py-1.5 flex items-center gap-2">
        <ArrowUpDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <ToggleGroup
          type="single"
          value={sortMode}
          onValueChange={(v) => v && setSortMode(v as SortMode)}
          className="gap-0"
        >
          <ToggleGroupItem value="startTime" className="h-6 px-1.5 text-[10px]">
            Start
          </ToggleGroupItem>
          <ToggleGroupItem value="duration" className="h-6 px-1.5 text-[10px]">
            Dur
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="w-px h-4 bg-border" />
        <ToggleGroup
          type="single"
          value={timeBand}
          onValueChange={(v) => v && setTimeBand(v as TimeBand)}
          className="gap-0"
        >
          <ToggleGroupItem value="all" className="h-6 px-1.5 text-[10px]">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="morning" className="h-6 px-1.5 text-[10px]">
            AM&thinsp;{bandCounts.morning}
          </ToggleGroupItem>
          <ToggleGroupItem value="midday" className="h-6 px-1.5 text-[10px]">
            Mid&thinsp;{bandCounts.midday}
          </ToggleGroupItem>
          <ToggleGroupItem value="afternoon" className="h-6 px-1.5 text-[10px]">
            PM&thinsp;{bandCounts.afternoon}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-1">
          {filteredAndSorted.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No trips in this time band
            </div>
          ) : (
            filteredAndSorted.map((trip) => {
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
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
