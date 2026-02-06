import type { Trip } from "@route-planner/shared";
import { parseTime } from "@route-planner/shared";

/** Get the earliest passenger scheduled time as a display string, or null. */
export function getEarliestTime(trip: Trip): string | null {
  let earliest: string | null = null;
  let earliestMin = Infinity;

  for (const p of trip.passengers) {
    if (!p.time) continue;
    const min = parseTime(p.time);
    if (min < 999 && min < earliestMin) {
      earliestMin = min;
      earliest = p.time;
    }
  }

  return earliest;
}

/** Get the earliest passenger time in minutes since midnight (for sorting). Returns Infinity if none. */
export function getEarliestTimeMinutes(trip: Trip): number {
  let earliest = Infinity;
  for (const p of trip.passengers) {
    if (!p.time) continue;
    const min = parseTime(p.time);
    if (min < 999 && min < earliest) earliest = min;
  }
  return earliest;
}

/** Get total trip duration in seconds (for sorting). Returns Infinity if unknown. */
export function getTripDurationSeconds(trip: Trip): number {
  if (!trip.directions || trip.directions.legs.length === 0) return Infinity;
  let total = 0;
  for (const leg of trip.directions.legs) {
    const hourMatch = leg.duration.match(/(\d+)\s*hour/);
    const minMatch = leg.duration.match(/(\d+)\s*min/);
    if (hourMatch) total += parseInt(hourMatch[1]) * 3600;
    if (minMatch) total += parseInt(minMatch[1]) * 60;
  }
  return total || Infinity;
}
