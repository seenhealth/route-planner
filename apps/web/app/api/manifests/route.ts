import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manifests } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allManifests = await db
      .select()
      .from(manifests)
      .orderBy(desc(manifests.uploadedAt));

    return NextResponse.json(allManifests);
  } catch (error) {
    console.error("Error fetching manifests:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifests" },
      { status: 500 }
    );
  }
}
