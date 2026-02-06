"use client";

import { useState, useEffect, useCallback } from "react";
import type { Trip, RouteData } from "@route-planner/shared";
import { StatsBar } from "@/components/routes/stats-bar";
import { FilterBar } from "@/components/routes/filter-bar";
import { TripList } from "@/components/routes/trip-list";
import { MapView } from "@/components/map/map-view";
import { RoutePolyline } from "@/components/map/route-polyline";
import { StopMarker } from "@/components/map/stop-marker";
import { HUB } from "@route-planner/shared";

type TypeFilter = "all" | "pickup" | "dropoff";
type TimeFilter = "all" | "morning" | "midday" | "afternoon";

export default function RoutesPage() {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoutes() {
      try {
        const res = await fetch("/api/routes");
        if (res.ok) {
          const data = await res.json();
          setRouteData(data);
        }
      } catch {
        // API not yet implemented - that is fine
      } finally {
        setLoading(false);
      }
    }
    fetchRoutes();
  }, []);

  const getAllTrips = useCallback((): Trip[] => {
    if (!routeData) return [];
    const all = [...routeData.pickupTrips, ...routeData.dropoffTrips];
    return all;
  }, [routeData]);

  const filteredTrips = getAllTrips().filter((trip) => {
    if (typeFilter !== "all" && trip.type !== typeFilter) return false;
    // Time filtering would use passenger times - for now just pass through
    return true;
  });

  const selectedTrip = filteredTrips.find((t) => t.id === selectedTripId) ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4 space-y-3">
        <StatsBar trips={filteredTrips} />
        <FilterBar
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          timeFilter={timeFilter}
          onTimeChange={setTimeFilter}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Trip list sidebar */}
        <div className="w-80 border-r overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading routes...
            </div>
          ) : (
            <TripList
              trips={filteredTrips}
              selectedTripId={selectedTripId}
              onSelectTrip={setSelectedTripId}
            />
          )}
        </div>

        {/* Map view */}
        <div className="flex-1">
          <MapView className="h-full w-full">
            {/* Hub marker */}
            <StopMarker
              lat={HUB.lat}
              lng={HUB.lng}
              label="H"
              color="#000000"
            />

            {/* Route polylines */}
            {filteredTrips.map((trip) =>
              trip.directions?.overviewPolyline ? (
                <RoutePolyline
                  key={trip.id}
                  encodedPath={trip.directions.overviewPolyline}
                  color={trip.color}
                  strokeWeight={selectedTrip?.id === trip.id ? 6 : 3}
                />
              ) : null
            )}

            {/* Passenger stop markers for selected trip */}
            {selectedTrip?.passengers.map((p, i) => (
              <StopMarker
                key={`${selectedTrip.id}-${i}`}
                lat={p.lat}
                lng={p.lng}
                label={String(i + 1)}
                color={selectedTrip.color}
              />
            ))}
          </MapView>
        </div>
      </div>
    </div>
  );
}
