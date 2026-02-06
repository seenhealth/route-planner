"use client";

import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { HUB } from "@route-planner/shared";
import React from "react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface MapViewProps {
  children?: React.ReactNode;
  className?: string;
}

export function MapView({ children, className }: MapViewProps) {
  if (!API_KEY) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}>
        <p className="text-sm">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        className={className}
        defaultCenter={{ lat: HUB.lat, lng: HUB.lng }}
        defaultZoom={11}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="route-planner-map"
      >
        {children}
      </Map>
    </APIProvider>
  );
}
