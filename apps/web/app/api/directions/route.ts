import { NextRequest, NextResponse } from "next/server";
import { getDirections } from "@/lib/directions";

function isLatLng(obj: unknown): obj is { lat: number; lng: number } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Record<string, unknown>).lat === "number" &&
    typeof (obj as Record<string, unknown>).lng === "number"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, waypoints = [] } = body;

    if (!isLatLng(origin)) {
      return NextResponse.json(
        { error: "origin must be an object with lat and lng numbers" },
        { status: 400 }
      );
    }

    if (!isLatLng(destination)) {
      return NextResponse.json(
        { error: "destination must be an object with lat and lng numbers" },
        { status: 400 }
      );
    }

    if (!Array.isArray(waypoints) || waypoints.some((w: unknown) => !isLatLng(w))) {
      return NextResponse.json(
        { error: "waypoints must be an array of {lat, lng} objects" },
        { status: 400 }
      );
    }

    const result = await getDirections(origin, destination, waypoints);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
