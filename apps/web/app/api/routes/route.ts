import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getManifest, listManifests, getCachedRouteData, cacheRouteData, getConfig, getVehicleConfig } from "@/lib/db";
import { parseManifestCSV } from "@/lib/csv-parser";
import type { ManifestRow } from "@route-planner/shared";
import { computeRoutes } from "@/lib/route-compute";

function computeConfigHash(
  config: { driveTimeLimitMinutes: number },
  vehicles: { vehicles: { id: string; name: string; capacity: number }[] }
): string {
  const payload = JSON.stringify({ config, vehicles });
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

export async function GET(request: NextRequest) {
  try {
    const manifestId = request.nextUrl.searchParams.get("manifestId");
    const force = request.nextUrl.searchParams.get("force") === "true";

    // Resolve manifestId — use explicit param or fall back to latest
    let resolvedManifestId: string | null = manifestId;
    if (!resolvedManifestId) {
      const all = await listManifests();
      if (all.length > 0) {
        resolvedManifestId = all[0].id;
      }
    }

    if (!resolvedManifestId) {
      return NextResponse.json({
        generated: "",
        totalPassengers: 0,
        hub: { name: "", address: "", lat: 0, lng: 0 },
        pickupTrips: [],
        dropoffTrips: [],
        _cache: { cached: false },
      });
    }

    // Read configs
    const [config, vehicleConfig] = await Promise.all([
      getConfig(),
      getVehicleConfig(),
    ]);
    const configHash = computeConfigHash(config, vehicleConfig);

    // Fast path: return cached computed routes if available
    if (!force) {
      const cached = await getCachedRouteData(resolvedManifestId, configHash);
      if (cached) {
        return NextResponse.json({
          ...cached.data,
          _cache: { cached: true, cachedAt: cached.cachedAt },
        });
      }
    }

    // Slow path: fetch CSV, parse, compute, cache, return
    const result = await getManifest(resolvedManifestId);

    if (!result) {
      return NextResponse.json({
        generated: "",
        totalPassengers: 0,
        hub: { name: "", address: "", lat: 0, lng: 0 },
        pickupTrips: [],
        dropoffTrips: [],
        _cache: { cached: false },
      });
    }

    const { rows: parsedRows } = parseManifestCSV(result.csvContent);

    const manifestRowData: ManifestRow[] = parsedRows.map((r) => ({
      jobDate: r.jobDate,
      idNumber: r.idNumber,
      custName: r.custName,
      phone: r.phone,
      bookingPurpose: r.bookingPurpose,
      puAddr: r.puAddr,
      puUnit: r.puUnit,
      pickupCity: r.pickupCity,
      puState: r.puState,
      pickZip: r.pickZip,
      doAddr: r.doAddr,
      doUnit: r.doUnit,
      dropCity: r.dropCity,
      doState: r.doState,
      dropZip: r.dropZip,
      assistiveDevice: r.assistiveDevice,
      nTotalWheelChairs: r.nTotalWheelChairs,
      nTotalPassengers: r.nTotalPassengers,
      schPU: r.schPU,
      aptTime: r.aptTime,
      notes: r.notes,
      jobID: r.jobID,
    }));

    const routeData = await computeRoutes(manifestRowData, config, vehicleConfig);

    // Cache the computed result with configHash
    await cacheRouteData(resolvedManifestId, routeData, configHash);

    return NextResponse.json({
      ...routeData,
      _cache: { cached: false, cachedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error("Error computing routes:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Route computation failed: ${message}` },
      { status: 500 }
    );
  }
}
