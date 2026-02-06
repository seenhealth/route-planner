"use client";

import type { Trip } from "@route-planner/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripCardProps {
  trip: Trip;
  selected: boolean;
  onSelect: (tripId: string) => void;
}

export function TripCard({ trip, selected, onSelect }: TripCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect(trip.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: trip.color }}
            />
            <span className="font-medium text-sm">{trip.area}</span>
          </div>
          <Badge variant={trip.type === "pickup" ? "default" : "secondary"} className="text-xs">
            {trip.type}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{trip.passengerCount} passengers</span>
        </div>
        {trip.directions && trip.directions.legs.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {trip.directions.legs.reduce((_, leg) => leg.duration, "")} total
          </p>
        )}
      </CardContent>
    </Card>
  );
}
