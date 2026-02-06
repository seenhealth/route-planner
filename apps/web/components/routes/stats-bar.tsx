"use client";

import type { Trip } from "@route-planner/shared";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, TrendingUp } from "lucide-react";

interface StatsBarProps {
  trips: Trip[];
}

export function StatsBar({ trips }: StatsBarProps) {
  const totalTrips = trips.length;
  const totalPassengers = trips.reduce((sum, t) => sum + t.passengerCount, 0);
  const avgPerTrip = totalTrips > 0 ? (totalPassengers / totalTrips).toFixed(1) : "0";

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="flex items-center gap-2 p-3">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{totalTrips}</p>
            <p className="text-xs text-muted-foreground">Total Trips</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-2 p-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{totalPassengers}</p>
            <p className="text-xs text-muted-foreground">Total Passengers</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-2 p-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{avgPerTrip}</p>
            <p className="text-xs text-muted-foreground">Avg per Trip</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
