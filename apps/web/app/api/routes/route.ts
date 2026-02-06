import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manifests, manifestRows } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { ManifestRow } from "@route-planner/shared";
import { computeRoutes } from "@/lib/route-compute";

export async function GET(request: NextRequest) {
  try {
    // Allow specifying a manifest by ID, otherwise use the latest
    const manifestId = request.nextUrl.searchParams.get("manifestId");

    let manifest;
    if (manifestId) {
      const result = await db
        .select()
        .from(manifests)
        .where(eq(manifests.id, manifestId))
        .limit(1);
      manifest = result[0] ?? null;
    } else {
      const result = await db
        .select()
        .from(manifests)
        .where(eq(manifests.status, "ready"))
        .orderBy(desc(manifests.uploadedAt))
        .limit(1);
      manifest = result[0] ?? null;
    }

    if (!manifest) {
      return NextResponse.json({
        generated: "",
        totalPassengers: 0,
        hub: { name: "", address: "", lat: 0, lng: 0 },
        pickupTrips: [],
        dropoffTrips: [],
      });
    }

    // Fetch all rows for this manifest
    const rows = await db
      .select()
      .from(manifestRows)
      .where(eq(manifestRows.manifestId, manifest.id));

    // Map DB rows to ManifestRow type
    const manifestRowData: ManifestRow[] = rows.map((r) => ({
      jobDate: r.jobDate,
      idNumber: r.idNumber,
      custName: r.custName,
      phone: r.phone ?? "",
      bookingPurpose: r.bookingPurpose ?? "",
      puAddr: r.puAddr ?? "",
      puUnit: r.puUnit ?? "",
      pickupCity: r.pickupCity ?? "",
      puState: r.puState ?? "",
      pickZip: r.pickZip ?? "",
      doAddr: r.doAddr ?? "",
      doUnit: r.doUnit ?? "",
      dropCity: r.dropCity ?? "",
      doState: r.doState ?? "",
      dropZip: r.dropZip ?? "",
      assistiveDevice: r.assistiveDevice ?? "",
      nTotalWheelChairs: r.nTotalWheelChairs ?? 0,
      nTotalPassengers: r.nTotalPassengers ?? 0,
      schPU: r.schPU ?? "",
      aptTime: r.aptTime ?? "",
      notes: r.notes ?? "",
      jobID: r.jobID,
    }));

    // Run the full compute pipeline: optimize → geocode → directions
    const routeData = await computeRoutes(manifestRowData);

    return NextResponse.json(routeData);
  } catch (err) {
    console.error("Error computing routes:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Route computation failed: ${message}` },
      { status: 500 }
    );
  }
}
