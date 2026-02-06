"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { Vehicle, VehicleConfig } from "@route-planner/shared";

export function VehicleConfigSection() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [originalVehicles, setOriginalVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((data: VehicleConfig) => {
        setVehicles(data.vehicles);
        setOriginalVehicles(data.vehicles);
      })
      .catch(() => setError("Failed to load vehicle config"))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = JSON.stringify(vehicles) !== JSON.stringify(originalVehicles);

  const totalCapacity = vehicles.reduce((sum, v) => sum + v.capacity, 0);

  const updateVehicle = useCallback((id: string, field: keyof Vehicle, value: string | number) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  }, []);

  const addVehicle = useCallback(() => {
    const nextNum = vehicles.length + 1;
    const newVehicle: Vehicle = {
      id: `vehicle-${Date.now()}`,
      name: `Vehicle ${nextNum}`,
      capacity: 4,
    };
    setVehicles((prev) => [...prev, newVehicle]);
  }, [vehicles.length]);

  const removeVehicle = useCallback((id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      const data: VehicleConfig = await res.json();
      setVehicles(data.vehicles);
      setOriginalVehicles(data.vehicles);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vehicle config");
    } finally {
      setSaving(false);
    }
  }, [vehicles]);

  const handleReset = useCallback(() => {
    setVehicles(originalVehicles);
  }, [originalVehicles]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Fleet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading vehicles...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Fleet</CardTitle>
        <CardDescription>
          Configure the vehicles available for transport. Each vehicle has a name and
          passenger capacity (seats). Total fleet capacity: {totalCapacity} seats across{" "}
          {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle list */}
        <div className="space-y-2">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_100px_40px] gap-3 text-xs font-medium text-muted-foreground px-1">
            <span>Name</span>
            <span>Seats</span>
            <span />
          </div>

          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="grid grid-cols-[1fr_100px_40px] gap-3 items-center"
            >
              <Input
                value={vehicle.name}
                onChange={(e) => updateVehicle(vehicle.id, "name", e.target.value)}
                placeholder="Vehicle name"
              />
              <Input
                type="number"
                min={1}
                max={20}
                value={vehicle.capacity}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 1 && val <= 20) {
                    updateVehicle(vehicle.id, "capacity", val);
                  }
                }}
                className="text-center"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeVehicle(vehicle.id)}
                disabled={vehicles.length <= 1}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add vehicle button */}
        <Button variant="outline" size="sm" onClick={addVehicle} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add Vehicle
        </Button>

        {/* Save / Reset */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              Reset
            </Button>
          )}
          {saved && <span className="text-sm text-green-600">Fleet saved</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
