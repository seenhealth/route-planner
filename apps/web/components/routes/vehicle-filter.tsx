"use client";

import type { Trip } from "@route-planner/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";

/** Extract the base vehicle name, stripping " (Trip N)" suffix. */
export function baseVehicleName(area: string): string {
  return area.replace(/ \(Trip \d+\)$/, "");
}

interface VehicleInfo {
  name: string;
  pickupCount: number;
  dropoffCount: number;
  color: string | null;
}

interface VehicleFilterProps {
  /** All trips (unfiltered by vehicle) used to derive vehicle list + counts */
  trips: Trip[];
  /** Currently selected base vehicle names; empty set = show all */
  selectedVehicles: Set<string>;
  onSelectionChange: (vehicles: Set<string>) => void;
}

/**
 * Derives the unique physical vehicles from trip `area` fields.
 * Groups by base name (e.g. "Van 1") and counts pickup/dropoff trips.
 */
function deriveVehicles(trips: Trip[]): VehicleInfo[] {
  const map = new Map<string, { pickups: number; dropoffs: number; color: string | null }>();

  for (const trip of trips) {
    const base = baseVehicleName(trip.area);
    const existing = map.get(base);
    if (existing) {
      if (trip.type === "pickup") existing.pickups += 1;
      else existing.dropoffs += 1;
    } else {
      map.set(base, {
        pickups: trip.type === "pickup" ? 1 : 0,
        dropoffs: trip.type === "dropoff" ? 1 : 0,
        color: trip.color ?? null,
      });
    }
  }

  return Array.from(map.entries())
    .map(([name, { pickups, dropoffs, color }]) => ({
      name,
      pickupCount: pickups,
      dropoffCount: dropoffs,
      color,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

export function VehicleFilter({
  trips,
  selectedVehicles,
  onSelectionChange,
}: VehicleFilterProps) {
  const vehicles = deriveVehicles(trips);

  if (vehicles.length === 0) return null;

  const allSelected = selectedVehicles.size === 0;

  function toggleVehicle(name: string) {
    const next = new Set(selectedVehicles);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    onSelectionChange(next);
  }

  function clearSelection() {
    onSelectionChange(new Set());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
        <Truck className="h-3.5 w-3.5" />
        <span>Vehicles</span>
      </div>

      {vehicles.map((vehicle) => {
        const isSelected = selectedVehicles.has(vehicle.name);
        const isActive = allSelected || isSelected;

        return (
          <button
            key={vehicle.name}
            type="button"
            onClick={() => toggleVehicle(vehicle.name)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-foreground/20 bg-foreground/5 text-foreground"
                : "border-transparent bg-muted text-muted-foreground opacity-50 hover:opacity-75"
            )}
          >
            {vehicle.color && (
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: vehicle.color }}
              />
            )}
            <span>{vehicle.name}</span>
            <span
              className={cn(
                "ml-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                isActive
                  ? "bg-foreground/10 text-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
              )}
            >
              {vehicle.pickupCount > 0 && <span>{vehicle.pickupCount}p</span>}
              {vehicle.dropoffCount > 0 && <span>{vehicle.dropoffCount}d</span>}
            </span>
          </button>
        );
      })}

      {!allSelected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="h-7 px-2 text-xs text-muted-foreground"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
