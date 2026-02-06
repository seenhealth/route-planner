import { NextRequest, NextResponse } from "next/server";
import type { ManifestRow, RouteData } from "@route-planner/shared";
import { HUB } from "@route-planner/shared";
import { buildOptimizedRoutes } from "@route-planner/shared";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let rows: ManifestRow[];

    if (body.rows && Array.isArray(body.rows)) {
      rows = body.rows;
    } else {
      return NextResponse.json(
        { error: "Request must include 'rows' (ManifestRow[])" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No manifest rows provided" },
        { status: 400 }
      );
    }

    const { pickupTrips, dropoffTrips } = buildOptimizedRoutes(rows);

    const routeData: RouteData = {
      generated: new Date().toISOString(),
      totalPassengers: rows.length,
      hub: { ...HUB },
      pickupTrips,
      dropoffTrips,
    };

    return NextResponse.json(routeData);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Optimization failed: ${message}` },
      { status: 500 }
    );
  }
}
