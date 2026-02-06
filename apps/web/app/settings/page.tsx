"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { VehicleConfigSection } from "@/components/settings/vehicle-config";
import { Trash2 } from "lucide-react";
import type { AppConfig } from "@/lib/db";

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [driveTime, setDriveTime] = useState(45);
  const [timeWindowBuffer, setTimeWindowBuffer] = useState(60);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: AppConfig) => {
        setConfig(data);
        setDriveTime(data.driveTimeLimitMinutes);
        setTimeWindowBuffer(data.timeWindowBufferMinutes);
      })
      .catch(() => setError("Failed to load settings"));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveTimeLimitMinutes: driveTime,
          timeWindowBufferMinutes: timeWindowBuffer,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      const data: AppConfig = await res.json();
      setConfig(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [driveTime, timeWindowBuffer]);

  const hasChanges = config !== null && (
    driveTime !== config.driveTimeLimitMinutes ||
    timeWindowBuffer !== config.timeWindowBufferMinutes
  );

  if (config === null && !error) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure routing parameters for trip optimization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drive Time Limit</CardTitle>
          <CardDescription>
            Maximum time any single passenger can be in the vehicle during a trip.
            The driver&apos;s total round-trip time may exceed this limit, but no
            individual passenger should ride longer than this threshold.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="drive-time-slider">Time limit</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="drive-time-input"
                  type="number"
                  min={15}
                  max={120}
                  step={5}
                  value={driveTime}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 15 && val <= 120) setDriveTime(val);
                  }}
                  className="w-20 text-right"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
            <Slider
              id="drive-time-slider"
              min={15}
              max={120}
              step={5}
              value={[driveTime]}
              onValueChange={(v) => setDriveTime(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15 min</span>
              <span>120 min</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">Settings saved</span>
            )}
            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Window Buffer</CardTitle>
          <CardDescription>
            Passengers are grouped by scheduled time. This sets how much
            flexibility (±) around each passenger&apos;s time the optimizer
            has. A smaller buffer means stricter time grouping.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="tw-slider">Buffer</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tw-input"
                  type="number"
                  min={15}
                  max={180}
                  step={15}
                  value={timeWindowBuffer}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 15 && val <= 180) setTimeWindowBuffer(val);
                  }}
                  className="w-20 text-right"
                />
                <span className="text-sm text-muted-foreground">± min</span>
              </div>
            </div>
            <Slider
              id="tw-slider"
              min={15}
              max={180}
              step={15}
              value={[timeWindowBuffer]}
              onValueChange={(v) => setTimeWindowBuffer(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>±15 min (strict)</span>
              <span>±180 min (flexible)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <VehicleConfigSection />

      <GeocodeCacheSection />
    </div>
  );
}

function GeocodeCacheSection() {
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleClear = useCallback(async () => {
    setClearing(true);
    setResult(null);
    try {
      const res = await fetch("/api/cache?prefix=geocode", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear cache");
      const data = await res.json();
      setResult(`Cleared ${data.deleted} cached entries. Recompute routes to re-geocode.`);
      setTimeout(() => setResult(null), 5000);
    } catch {
      setResult("Failed to clear geocode cache");
    } finally {
      setClearing(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geocode Cache</CardTitle>
        <CardDescription>
          Address coordinates are cached for 30 days. If markers appear at
          wrong locations, clear the cache and recompute routes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
            disabled={clearing}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {clearing ? "Clearing..." : "Clear Geocode Cache"}
          </Button>
          {result && (
            <span className="text-sm text-muted-foreground">{result}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
