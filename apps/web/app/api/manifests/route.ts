import { NextResponse } from "next/server";
import { listManifests } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listManifests());
  } catch (error) {
    console.error("Error fetching manifests:", error);
    return NextResponse.json({ error: "Failed to fetch manifests" }, { status: 500 });
  }
}
