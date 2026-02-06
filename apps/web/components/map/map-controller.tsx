"use client";

import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import type { Trip } from "@route-planner/shared";
import { HUB } from "@route-planner/shared";

interface MapControllerProps {
  /** When set, the map will pan/zoom to fit this trip's route */
  fitToTrip: Trip | null;
  /** Triggered when the map should reset to default view */
  resetView?: boolean;
}

export function MapController({ fitToTrip, resetView }: MapControllerProps) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");
  const prevTripIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map) return;

    if (resetView && !fitToTrip) {
      map.panTo({ lat: HUB.lat, lng: HUB.lng });
      map.setZoom(11);
      prevTripIdRef.current = null;
      return;
    }

    if (!fitToTrip) {
      prevTripIdRef.current = null;
      return;
    }

    // Only animate if the trip actually changed
    if (fitToTrip.id === prevTripIdRef.current) return;
    prevTripIdRef.current = fitToTrip.id;

    const bounds = new google.maps.LatLngBounds();

    // Add hub
    bounds.extend({ lat: HUB.lat, lng: HUB.lng });

    // Add all valid passenger locations
    for (const p of fitToTrip.passengers) {
      if (p.lat !== 0 && p.lng !== 0) {
        bounds.extend({ lat: p.lat, lng: p.lng });
      }
    }

    // If we have a decoded polyline, include those points for accuracy
    if (geometryLib && fitToTrip.directions?.overviewPolyline) {
      const path = geometryLib.encoding.decodePath(fitToTrip.directions.overviewPolyline);
      for (const point of path) {
        bounds.extend(point);
      }
    }

    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, geometryLib, fitToTrip, resetView]);

  return null;
}
