"use client";

import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

interface RoutePolylineProps {
  encodedPath: string;
  color: string;
  strokeWeight?: number;
}

export function RoutePolyline({ encodedPath, color, strokeWeight = 4 }: RoutePolylineProps) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");

  useEffect(() => {
    if (!map || !geometryLib || !encodedPath) return;

    const path = geometryLib.encoding.decodePath(encodedPath);
    const polyline = new google.maps.Polyline({
      path,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, geometryLib, encodedPath, color, strokeWeight]);

  return null;
}
