"use client";

import { useState, useMemo } from "react";
import type { PassengerInfo } from "@/lib/passenger-index";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Clock, MapPin } from "lucide-react";

interface PassengerListProps {
  passengers: PassengerInfo[];
  selectedName: string | null;
  onSelect: (passenger: PassengerInfo) => void;
}

export function PassengerList({
  passengers,
  selectedName,
  onSelect,
}: PassengerListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return passengers;
    const q = search.toLowerCase().trim();
    return passengers.filter((p) => p.name.toLowerCase().includes(q));
  }, [passengers, search]);

  return (
    <div className="flex h-full flex-col">
      {/* Search input */}
      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search passengers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {filtered.length} of {passengers.length} passengers
        </p>
      </div>

      {/* Passenger list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-1">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              {search ? "No matching passengers" : "No passengers"}
            </div>
          ) : (
            filtered.map((passenger) => (
              <PassengerRow
                key={passenger.name}
                passenger={passenger}
                selected={passenger.name === selectedName}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PassengerRow({
  passenger,
  selected,
  onSelect,
}: {
  passenger: PassengerInfo;
  selected: boolean;
  onSelect: (p: PassengerInfo) => void;
}) {
  return (
    <div
      className={`cursor-pointer rounded-md px-3 py-2 transition-colors hover:bg-accent ${
        selected ? "bg-accent ring-1 ring-primary" : ""
      }`}
      onClick={() => onSelect(passenger)}
    >
      {/* Name */}
      <div className="font-medium text-sm truncate">{passenger.name}</div>

      {/* Trip assignments */}
      <div className="flex items-center gap-3 mt-1">
        {passenger.pickupTrip && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: passenger.pickupTrip.color }}
            />
            <span className="truncate">{passenger.pickupTrip.area}</span>
          </div>
        )}
        {passenger.dropoffTrip && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: passenger.dropoffTrip.color }}
            />
            <span className="truncate">{passenger.dropoffTrip.area}</span>
          </div>
        )}
      </div>

      {/* Time and address */}
      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
        {passenger.time && (
          <div className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            <span>{passenger.time}</span>
          </div>
        )}
        {passenger.address && (
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
            <span className="truncate">{passenger.address}</span>
          </div>
        )}
      </div>

      {/* Notes preview */}
      {passenger.notes && (
        <div className="mt-0.5 text-[10px] text-muted-foreground/70 truncate">
          {passenger.notes}
        </div>
      )}
    </div>
  );
}
