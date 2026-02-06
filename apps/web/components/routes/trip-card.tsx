"use client";

import type { Trip } from "@route-planner/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripCardProps {
  trip: Trip;
  selected: boolean;
  dimmed: boolean;
  onSelect: (tripId: string) => void;
  onHoverStart: (tripId: string) => void;
  onHoverEnd: () => void;
}

function computeTotalDuration(trip: Trip): string | null {
  if (!trip.directions || trip.directions.legs.length === 0) return null;
  let totalSeconds = 0;
  for (const leg of trip.directions.legs) {
    const dur = leg.duration;
    const hourMatch = dur.match(/(\d+)\s*hour/);
    const minMatch = dur.match(/(\d+)\s*min/);
    if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
    if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
  }
  if (totalSeconds === 0) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

function computeStopCount(trip: Trip): number {
  return trip.passengers.filter((p) => p.lat !== 0 && p.lng !== 0).length;
}

export function TripCard({
  trip,
  selected,
  dimmed,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: TripCardProps) {
  const duration = computeTotalDuration(trip);
  const stops = computeStopCount(trip);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary shadow-md",
        dimmed && "opacity-40"
      )}
      onClick={() => onSelect(trip.id)}
      onMouseEnter={() => onHoverStart(trip.id)}
      onMouseLeave={onHoverEnd}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: trip.color }}
            />
            <span className="font-medium text-sm">{trip.area}</span>
          </div>
          <Badge variant={trip.type === "pickup" ? "default" : "secondary"} className="text-xs">
            {trip.type}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{trip.passengerCount}</span>
          </div>
          {stops > 0 && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{stops} stops</span>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{duration}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
