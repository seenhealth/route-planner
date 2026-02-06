"use client";

import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";

interface RoutePolylineProps {
  encodedPath: string;
  color: string;
  strokeWeight?: number;
  strokeOpacity?: number;
  tripId?: string;
  onHover?: (tripId: string | null) => void;
  onClick?: (tripId: string) => void;
}

export function RoutePolyline({
  encodedPath,
  color,
  strokeWeight = 4,
  strokeOpacity = 0.8,
  tripId,
  onHover,
  onClick,
}: RoutePolylineProps) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !geometryLib || !encodedPath) return;

    const path = geometryLib.encoding.decodePath(encodedPath);
    const polyline = new google.maps.Polyline({
      path,
      strokeColor: color,
      strokeOpacity,
      strokeWeight,
      map,
      zIndex: strokeWeight > 4 ? 2 : 1,
    });

    polylineRef.current = polyline;

    // Hover events
    if (onHover && tripId) {
      polyline.addListener("mouseover", () => {
        onHover(tripId);
      });
      polyline.addListener("mouseout", () => {
        onHover(null);
      });
    }

    // Click events
    if (onClick && tripId) {
      polyline.addListener("click", () => {
        onClick(tripId);
      });
    }

    return () => {
      google.maps.event.clearInstanceListeners(polyline);
      polyline.setMap(null);
      polylineRef.current = null;
    };
  }, [map, geometryLib, encodedPath, color, strokeWeight, strokeOpacity, tripId, onHover, onClick]);

  return null;
}
