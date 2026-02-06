"use client";

import { AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { useState, useCallback } from "react";

interface StopMarkerProps {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  scale?: number;
  opacity?: number;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
  /** Content to show in info window on hover */
  infoContent?: React.ReactNode;
  /** Whether to force the info window open (e.g., when selected) */
  showInfo?: boolean;
  /** z-index for layering */
  zIndex?: number;
}

export function StopMarker({
  lat,
  lng,
  label,
  color = "#4285F4",
  scale = 1,
  opacity = 1,
  onClick,
  onHover,
  infoContent,
  showInfo = false,
  zIndex,
}: StopMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const showInfoWindow = (isHovered || showInfo) && infoContent;

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(true);
  }, [onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(false);
  }, [onHover]);

  return (
    <>
      <AdvancedMarker
        position={{ lat, lng }}
        onClick={onClick}
        zIndex={zIndex}
      >
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ opacity, transform: `scale(${scale})`, transition: "all 150ms ease" }}
        >
          <Pin
            background={color}
            borderColor={color}
            glyphColor="#fff"
            glyph={label}
          />
        </div>
      </AdvancedMarker>
      {showInfoWindow && (
        <InfoWindow
          position={{ lat, lng }}
          pixelOffset={[0, -40]}
          headerDisabled
          shouldFocus={false}
        >
          {infoContent}
        </InfoWindow>
      )}
    </>
  );
}
