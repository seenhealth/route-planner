import { NextResponse } from "next/server";
import { getVehicleConfig, saveVehicleConfig } from "@/lib/db";
import type { VehicleConfig } from "@route-planner/shared";

export async function GET() {
  const config = await getVehicleConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as VehicleConfig;
    if (!Array.isArray(body.vehicles)) {
      return NextResponse.json({ error: "vehicles must be an array" }, { status: 400 });
    }
    for (const v of body.vehicles) {
      if (!v.id || !v.name || typeof v.capacity !== "number" || v.capacity < 1) {
        return NextResponse.json(
          { error: "Each vehicle needs id, name, and capacity >= 1" },
          { status: 400 }
        );
      }
    }
    await saveVehicleConfig(body);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
