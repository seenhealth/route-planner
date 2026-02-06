"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface FilterBarProps {
  typeFilter: "all" | "pickup" | "dropoff";
  onTypeChange: (value: "all" | "pickup" | "dropoff") => void;
  timeFilter: "all" | "morning" | "midday" | "afternoon";
  onTimeChange: (value: "all" | "morning" | "midday" | "afternoon") => void;
}

export function FilterBar({ typeFilter, onTypeChange, timeFilter, onTimeChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup type="single" value={typeFilter} onValueChange={(v) => onTypeChange(v as FilterBarProps["typeFilter"])}>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="pickup">Pickups</ToggleGroupItem>
        <ToggleGroupItem value="dropoff">Dropoffs</ToggleGroupItem>
      </ToggleGroup>

      <ToggleGroup type="single" value={timeFilter} onValueChange={(v) => onTimeChange(v as FilterBarProps["timeFilter"])}>
        <ToggleGroupItem value="all">All Times</ToggleGroupItem>
        <ToggleGroupItem value="morning">Morning</ToggleGroupItem>
        <ToggleGroupItem value="midday">Midday</ToggleGroupItem>
        <ToggleGroupItem value="afternoon">Afternoon</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
