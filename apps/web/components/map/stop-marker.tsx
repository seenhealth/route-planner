"use client";

import { AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

interface StopMarkerProps {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  onClick?: () => void;
}

export function StopMarker({ lat, lng, label, color = "#4285F4", onClick }: StopMarkerProps) {
  return (
    <AdvancedMarker
      position={{ lat, lng }}
      onClick={onClick}
    >
      <Pin
        background={color}
        borderColor={color}
        glyphColor="#fff"
        glyph={label}
      />
    </AdvancedMarker>
  );
}
