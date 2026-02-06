"use client";

import { useState, useCallback, useMemo } from "react";
import type { Trip, RouteData } from "@route-planner/shared";
import { StatsBar } from "@/components/routes/stats-bar";
import { FilterBar } from "@/components/routes/filter-bar";
import { TripList } from "@/components/routes/trip-list";
import { TripDetail } from "@/components/routes/trip-detail";
import { MapView } from "@/components/map/map-view";
import { StopMarker } from "@/components/map/stop-marker";
import { RouteVisualization } from "@/components/map/route-visualization";
import { MapController } from "@/components/map/map-controller";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ManifestSelector, formatRelativeTime } from "@/components/routes/manifest-selector";
import type { ManifestOption } from "@/components/routes/manifest-selector";
import { HUB } from "@route-planner/shared";
import { useMapInteractions } from "@/hooks/use-map-interactions";

type TypeFilter = "all" | "pickup" | "dropoff";

interface CacheInfo {
  cached: boolean;
  cachedAt?: string;
}

export default function RoutesPage() {
  const [selectedManifest, setSelectedManifest] = useState<ManifestOption | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const { state: interaction, actions } = useMapInteractions();

  const fetchRoutes = useCallback(async (manifestId: string, force = false) => {
    try {
      if (force) {
        setRecomputing(true);
      } else {
        setLoading(true);
      }
      const params = new URLSearchParams({ manifestId });
      if (force) params.set("force", "true");
      const res = await fetch(`/api/routes?${params}`);
      if (res.ok) {
        const data = await res.json();
        const { _cache, ...routePayload } = data;
        setRouteData(routePayload as RouteData);
        setCacheInfo(_cache ?? null);
        actions.clearSelectedTrip();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRecomputing(false);
    }
  }, [actions]);

  const handleManifestSelect = useCallback((manifest: ManifestOption) => {
    setSelectedManifest(manifest);
    setRouteData(null);
    setCacheInfo(null);
    fetchRoutes(manifest.id);
  }, [fetchRoutes]);

  const getAllTrips = useCallback((): Trip[] => {
    if (!routeData) return [];
    return [...routeData.pickupTrips, ...routeData.dropoffTrips];
  }, [routeData]);

  // Trips filtered by type only — used by VehicleFilter to show accurate per-vehicle counts
  const typeFilteredTrips = useMemo(() => {
    return getAllTrips().filter((trip) => {
      if (typeFilter !== "all" && trip.type !== typeFilter) return false;
      return true;
    });
  }, [getAllTrips, typeFilter]);

  // Trips filtered by type AND vehicle selection
  const filteredTrips = useMemo(() => {
    if (selectedVehicles.size === 0) return typeFilteredTrips;
    return typeFilteredTrips.filter((trip) => {
      const base = trip.area.replace(/ \(Trip \d+\)$/, "");
      return selectedVehicles.has(base);
    });
  }, [typeFilteredTrips, selectedVehicles]);

  const selectedTrip = useMemo(
    () => filteredTrips.find((t) => t.id === interaction.selectedTripId) ?? null,
    [filteredTrips, interaction.selectedTripId]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Top bar: manifest selector + cache status + recompute */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <ManifestSelector
            selectedId={selectedManifest?.id ?? null}
            onSelect={handleManifestSelect}
          />
          <div className="flex items-center gap-3">
            {cacheInfo && (
              <span className="text-xs text-muted-foreground">
                {cacheInfo.cached ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 mr-1">
                      Cached
                    </span>
                    {cacheInfo.cachedAt && <>computed {formatRelativeTime(cacheInfo.cachedAt)}</>}
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 mr-1">
                      Fresh
                    </span>
                    {cacheInfo.cachedAt && <>computed {formatRelativeTime(cacheInfo.cachedAt)}</>}
                  </>
                )}
              </span>
            )}
            {selectedManifest && (
              <Button
                variant="outline"
                size="sm"
                disabled={recomputing || loading}
                onClick={() => fetchRoutes(selectedManifest.id, true)}
              >
                {recomputing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {recomputing ? "Recomputing..." : "Recompute Routes"}
              </Button>
            )}
          </div>
        </div>

        {/* Stats + filters only when we have route data */}
        {routeData && routeData.pickupTrips.length + routeData.dropoffTrips.length > 0 && (
          <>
            <StatsBar trips={filteredTrips} />
            <FilterBar
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              trips={typeFilteredTrips}
              selectedVehicles={selectedVehicles}
              onVehicleSelectionChange={setSelectedVehicles}
            />
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Trip list / detail sidebar */}
        <div className="w-80 border-r overflow-hidden flex flex-col">
          {!selectedManifest ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Select a manifest to view routes
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Computing routes...</span>
            </div>
          ) : selectedTrip ? (
            <TripDetail
              trip={selectedTrip}
              onBack={actions.clearSelectedTrip}
              onHoverPassenger={actions.hoverPassenger}
              onSelectPassenger={actions.selectPassenger}
              selectedPassengerKey={interaction.selectedPassengerKey}
              hoveredPassengerKey={interaction.hoveredPassengerKey}
            />
          ) : filteredTrips.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No routes to display
            </div>
          ) : (
            <TripList
              trips={filteredTrips}
              selectedTripId={interaction.selectedTripId}
              hoveredTripId={interaction.hoveredTripId}
              onSelectTrip={actions.selectTrip}
              onHoverTrip={actions.hoverTrip}
            />
          )}
        </div>

        {/* Map view */}
        <div className="flex-1 relative">
          {recomputing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
              <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 shadow-lg border text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recomputing routes...
              </div>
            </div>
          )}
          <MapView className="h-full w-full">
            {/* Map controller for fit-to-trip zoom */}
            <MapController
              fitToTrip={selectedTrip}
              resetView={!selectedTrip}
            />

            {/* Hub marker — always visible, always on top */}
            <StopMarker
              lat={HUB.lat}
              lng={HUB.lng}
              label="H"
              color="#000000"
              zIndex={200}
              infoContent={
                <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 12 }}>
                  <strong>{HUB.name}</strong>
                  <div style={{ color: "#555", marginTop: 2 }}>{HUB.address}</div>
                </div>
              }
            />

            {/* Full route visualization layer */}
            <RouteVisualization
              trips={filteredTrips}
              hoveredTripId={interaction.hoveredTripId}
              selectedTripId={interaction.selectedTripId}
              hoveredPassengerKey={interaction.hoveredPassengerKey}
              selectedPassengerKey={interaction.selectedPassengerKey}
              onHoverTrip={actions.hoverTrip}
              onSelectTrip={actions.selectTrip}
              onHoverPassenger={actions.hoverPassenger}
              onSelectPassenger={actions.selectPassenger}
            />
          </MapView>
        </div>
      </div>
    </div>
  );
}
