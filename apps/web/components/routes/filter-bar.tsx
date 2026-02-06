"use client";

import type { Trip } from "@route-planner/shared";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VehicleFilter } from "./vehicle-filter";

interface FilterBarProps {
  typeFilter: "all" | "pickup" | "dropoff";
  onTypeChange: (value: "all" | "pickup" | "dropoff") => void;
  /** All trips (before vehicle filtering) for deriving vehicle list + counts */
  trips: Trip[];
  selectedVehicles: Set<string>;
  onVehicleSelectionChange: (vehicles: Set<string>) => void;
}

export function FilterBar({
  typeFilter,
  onTypeChange,
  trips,
  selectedVehicles,
  onVehicleSelectionChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup type="single" value={typeFilter} onValueChange={(v) => onTypeChange(v as FilterBarProps["typeFilter"])}>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="pickup">Pickups</ToggleGroupItem>
        <ToggleGroupItem value="dropoff">Dropoffs</ToggleGroupItem>
      </ToggleGroup>

      <VehicleFilter
        trips={trips}
        selectedVehicles={selectedVehicles}
        onSelectionChange={onVehicleSelectionChange}
      />
    </div>
  );
}
