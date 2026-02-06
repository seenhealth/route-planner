"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export interface ManifestOption {
  id: string;
  fileName: string;
  jobDate: string;
  uploadedAt: string;
  blobUrl: string;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

interface ManifestSelectorProps {
  selectedId: string | null;
  onSelect: (manifest: ManifestOption) => void;
  /** Auto-select the most recent manifest on first load */
  autoSelectFirst?: boolean;
}

export function ManifestSelector({ selectedId, onSelect, autoSelectFirst }: ManifestSelectorProps) {
  const [manifests, setManifests] = useState<ManifestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [didAutoSelect, setDidAutoSelect] = useState(false);

  const fetchManifests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manifests");
      if (res.ok) {
        const data: ManifestOption[] = await res.json();
        setManifests(data);
        // Auto-select most recent manifest on first load
        if (autoSelectFirst && !didAutoSelect && data.length > 0) {
          setDidAutoSelect(true);
          onSelect(data[0]);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = manifests.find((m) => m.id === selectedId);

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[280px]"
        value={selectedId ?? ""}
        onChange={(e) => {
          const m = manifests.find((m) => m.id === e.target.value);
          if (m) onSelect(m);
        }}
        disabled={loading || manifests.length === 0}
      >
        {loading ? (
          <option value="">Loading manifests...</option>
        ) : manifests.length === 0 ? (
          <option value="">No manifests uploaded</option>
        ) : (
          <>
            <option value="" disabled>Select a manifest</option>
            {manifests.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fileName} — {formatBytes(m.size)} — {formatRelativeTime(m.uploadedAt)}
              </option>
            ))}
          </>
        )}
      </select>
      <Button
        variant="ghost"
        size="sm"
        onClick={fetchManifests}
        disabled={loading}
        className="h-9 px-2 text-muted-foreground"
      >
        {loading ? "..." : "↻"}
      </Button>
      {selected && (
        <span className="text-xs text-muted-foreground">
          Uploaded {formatRelativeTime(selected.uploadedAt)}
        </span>
      )}
    </div>
  );
}

export { formatRelativeTime };
