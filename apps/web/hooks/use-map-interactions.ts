"use client";

import { useState, useCallback } from "react";

export interface MapInteractionState {
  /** Trip ID being hovered (from sidebar card or polyline) */
  hoveredTripId: string | null;
  /** Trip ID that is selected/pinned (persists after hover ends) */
  selectedTripId: string | null;
  /** Passenger index being hovered on the map */
  hoveredPassengerKey: string | null;
  /** Passenger key that is selected/pinned */
  selectedPassengerKey: string | null;
}

export interface MapInteractionActions {
  hoverTrip: (tripId: string | null) => void;
  selectTrip: (tripId: string) => void;
  clearSelectedTrip: () => void;
  hoverPassenger: (key: string | null) => void;
  selectPassenger: (key: string | null) => void;
}

export function useMapInteractions() {
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [hoveredPassengerKey, setHoveredPassengerKey] = useState<string | null>(null);
  const [selectedPassengerKey, setSelectedPassengerKey] = useState<string | null>(null);

  const hoverTrip = useCallback((tripId: string | null) => {
    setHoveredTripId(tripId);
  }, []);

  const selectTrip = useCallback((tripId: string) => {
    setSelectedTripId((prev) => (prev === tripId ? null : tripId));
    // Clear passenger selection when switching trips
    setSelectedPassengerKey(null);
  }, []);

  const clearSelectedTrip = useCallback(() => {
    setSelectedTripId(null);
    setSelectedPassengerKey(null);
  }, []);

  const hoverPassenger = useCallback((key: string | null) => {
    setHoveredPassengerKey(key);
  }, []);

  const selectPassenger = useCallback((key: string | null) => {
    setSelectedPassengerKey((prev) => (prev === key ? null : key));
  }, []);

  const state: MapInteractionState = {
    hoveredTripId,
    selectedTripId,
    hoveredPassengerKey,
    selectedPassengerKey,
  };

  const actions: MapInteractionActions = {
    hoverTrip,
    selectTrip,
    clearSelectedTrip,
    hoverPassenger,
    selectPassenger,
  };

  return { state, actions };
}
