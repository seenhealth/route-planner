"use client";

import type { Trip, Passenger } from "@route-planner/shared";
import { HUB } from "@route-planner/shared";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Users,
  Clock,
  MapPin,
  Phone,
  Navigation,
  Building2,
} from "lucide-react";

interface TripDetailProps {
  trip: Trip;
  onBack: () => void;
  onHoverPassenger: (key: string | null) => void;
  onSelectPassenger: (key: string | null) => void;
  selectedPassengerKey: string | null;
  hoveredPassengerKey: string | null;
}

/** A stop in the ordered itinerary. */
interface ItineraryStop {
  /** 0-based stop index in display order */
  index: number;
  /** "hub" or "passenger" */
  type: "hub" | "passenger";
  /** Display label for this stop */
  label: string;
  /** Full address */
  address: string;
  /** Passenger info (null for hub stops) */
  passenger: Passenger | null;
  /** Original passenger index in trip.passengers (for interaction keys) */
  passengerIndex: number | null;
  /** Leg from previous stop: distance text */
  legDistance: string | null;
  /** Leg from previous stop: duration text */
  legDuration: string | null;
}

/**
 * Build an ordered itinerary from the trip data.
 *
 * Passengers are already stored in driving order (reordered at compute time),
 * so we just iterate the array and add hub bookends:
 *   Pickup:  passenger₁ → passenger₂ → … → Hub
 *   Dropoff: Hub → passenger₁ → passenger₂ → …
 *
 * Leg distances/durations come from trip.directions.legs (same order).
 */
function buildItinerary(trip: Trip): ItineraryStop[] {
  const stops: ItineraryStop[] = [];
  const passengers = trip.passengers;
  const legs = trip.directions?.legs ?? [];

  if (trip.type === "pickup") {
    // Passengers first, then hub at end
    passengers.forEach((p, i) => {
      const leg = legs[i] ?? null; // leg[0] = travel to first stop from origin, etc.
      stops.push({
        index: stops.length,
        type: "passenger",
        label: p.name || `Passenger ${i + 1}`,
        address: p.address,
        passenger: p,
        passengerIndex: i,
        legDistance: i > 0 ? (leg?.distance ?? null) : null,
        legDuration: i > 0 ? (leg?.duration ?? null) : null,
      });
    });
    // Hub at end
    const lastLeg = legs[legs.length - 1] ?? null;
    stops.push({
      index: stops.length,
      type: "hub",
      label: HUB.name,
      address: HUB.address,
      passenger: null,
      passengerIndex: null,
      legDistance: lastLeg?.distance ?? null,
      legDuration: lastLeg?.duration ?? null,
    });
  } else {
    // Hub first, then passengers
    stops.push({
      index: 0,
      type: "hub",
      label: HUB.name,
      address: HUB.address,
      passenger: null,
      passengerIndex: null,
      legDistance: null,
      legDuration: null,
    });
    passengers.forEach((p, i) => {
      const leg = legs[i] ?? null;
      const addr = p.destAddress || p.address;
      stops.push({
        index: stops.length,
        type: "passenger",
        label: p.name || `Passenger ${i + 1}`,
        address: addr,
        passenger: p,
        passengerIndex: i,
        legDistance: leg?.distance ?? null,
        legDuration: leg?.duration ?? null,
      });
    });
  }

  return stops;
}

/** Sum all leg distances, returning total in a readable string. */
function computeTotalDistance(trip: Trip): string | null {
  if (!trip.directions || trip.directions.legs.length === 0) return null;

  let totalMeters = 0;
  for (const leg of trip.directions.legs) {
    // Distance is like "2.3 mi" or "0.5 mi"
    const miMatch = leg.distance.match(/([\d.]+)\s*mi/);
    const kmMatch = leg.distance.match(/([\d.]+)\s*km/);
    if (miMatch) totalMeters += parseFloat(miMatch[1]) * 1609.34;
    if (kmMatch) totalMeters += parseFloat(kmMatch[1]) * 1000;
  }

  if (totalMeters === 0) return null;

  const miles = totalMeters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

/** Sum all leg durations, returning total in a readable string. */
function computeTotalDuration(trip: Trip): string | null {
  if (!trip.directions || trip.directions.legs.length === 0) return null;

  let totalSeconds = 0;
  for (const leg of trip.directions.legs) {
    const hourMatch = leg.duration.match(/(\d+)\s*hour/);
    const minMatch = leg.duration.match(/(\d+)\s*min/);
    if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
    if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
  }

  if (totalSeconds === 0) return null;

  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

export function TripDetail({
  trip,
  onBack,
  onHoverPassenger,
  onSelectPassenger,
  selectedPassengerKey,
  hoveredPassengerKey,
}: TripDetailProps) {
  const itinerary = buildItinerary(trip);
  const totalDistance = computeTotalDistance(trip);
  const totalDuration = computeTotalDuration(trip);
  const stopCount = itinerary.filter((s) => s.type === "passenger").length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div
            className="h-3.5 w-3.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: trip.color }}
          />
          <span className="font-semibold text-sm flex-1 truncate">
            {trip.area}
          </span>
          <Badge
            variant={trip.type === "pickup" ? "default" : "secondary"}
            className="text-xs"
          >
            {trip.type}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground ml-10">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              {trip.passengerCount} passenger{trip.passengerCount !== 1 ? "s" : ""}
            </span>
          </div>
          {totalDuration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{totalDuration}</span>
            </div>
          )}
          {totalDistance && (
            <div className="flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              <span>{totalDistance}</span>
            </div>
          )}
        </div>
      </div>

      {/* Itinerary timeline */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {itinerary.map((stop, i) => {
            const isLast = i === itinerary.length - 1;
            const passengerKey =
              stop.passengerIndex !== null
                ? `${trip.id}-${stop.passengerIndex}`
                : null;
            const isSelected = passengerKey === selectedPassengerKey;
            const isHovered = passengerKey === hoveredPassengerKey;

            return (
              <div key={i} className="flex">
                {/* Timeline connector */}
                <div className="flex flex-col items-center mr-3 flex-shrink-0">
                  {/* Stop dot */}
                  <div
                    className={`flex items-center justify-center rounded-full text-[9px] font-bold text-white flex-shrink-0 ${
                      stop.type === "hub" ? "h-6 w-6" : "h-5 w-5"
                    }`}
                    style={{
                      backgroundColor:
                        stop.type === "hub" ? "#000000" : trip.color,
                      outline:
                        isSelected || isHovered
                          ? `2px solid ${trip.color}`
                          : "none",
                      outlineOffset: "2px",
                    }}
                  >
                    {stop.type === "hub" ? "H" : stop.index}
                  </div>
                  {/* Vertical connector line */}
                  {!isLast && (
                    <div
                      className="w-0.5 flex-1 min-h-4"
                      style={{ backgroundColor: `${trip.color}33` }}
                    />
                  )}
                </div>

                {/* Stop content */}
                <div
                  className={`flex-1 pb-4 min-w-0 ${
                    stop.type === "passenger" ? "cursor-pointer" : ""
                  } ${
                    isSelected
                      ? "bg-accent/50 -mx-1 px-1 rounded"
                      : isHovered
                        ? "bg-accent/30 -mx-1 px-1 rounded"
                        : ""
                  }`}
                  onMouseEnter={() =>
                    passengerKey && onHoverPassenger(passengerKey)
                  }
                  onMouseLeave={() => onHoverPassenger(null)}
                  onClick={() =>
                    passengerKey && onSelectPassenger(passengerKey)
                  }
                >
                  {/* Leg info (distance/time from previous stop) */}
                  {stop.legDistance && stop.legDuration && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                      <span>{stop.legDistance}</span>
                      <span className="text-muted-foreground/50">|</span>
                      <span>{stop.legDuration}</span>
                    </div>
                  )}

                  {/* Stop name */}
                  <div className="flex items-center gap-1.5">
                    {stop.type === "hub" ? (
                      <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm font-medium truncate ${
                        stop.type === "hub" ? "text-muted-foreground" : ""
                      }`}
                    >
                      {stop.label}
                    </span>
                  </div>

                  {/* Address */}
                  <p className="text-xs text-muted-foreground mt-0.5 ml-[18px] break-words">
                    {stop.address}
                  </p>

                  {/* Passenger details */}
                  {stop.passenger && (
                    <div className="ml-[18px] mt-1 space-y-0.5">
                      {stop.passenger.time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{stop.passenger.time}</span>
                        </div>
                      )}
                      {stop.passenger.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-2.5 w-2.5" />
                          <span>{stop.passenger.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Trip summary footer */}
      <div className="border-t p-3">
        <Separator className="mb-3" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{stopCount}</p>
            <p className="text-[10px] text-muted-foreground">Stops</p>
          </div>
          <div>
            <p className="text-lg font-bold">{totalDistance ?? "--"}</p>
            <p className="text-[10px] text-muted-foreground">Distance</p>
          </div>
          <div>
            <p className="text-lg font-bold">{totalDuration ?? "--"}</p>
            <p className="text-[10px] text-muted-foreground">Drive Time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
