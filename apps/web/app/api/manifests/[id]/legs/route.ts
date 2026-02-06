import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manifests, manifestRows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const type = request.nextUrl.searchParams.get("type");

    // Verify manifest exists
    const manifest = await db
      .select()
      .from(manifests)
      .where(eq(manifests.id, id))
      .limit(1);

    if (manifest.length === 0) {
      return NextResponse.json(
        { error: "Manifest not found" },
        { status: 404 }
      );
    }

    let rows;
    if (type === "pickup" || type === "dropoff") {
      rows = await db
        .select()
        .from(manifestRows)
        .where(
          and(
            eq(manifestRows.manifestId, id),
            eq(manifestRows.legType, type)
          )
        );
    } else {
      rows = await db
        .select()
        .from(manifestRows)
        .where(eq(manifestRows.manifestId, id));
    }

    return NextResponse.json({
      manifestId: id,
      legType: type ?? "all",
      count: rows.length,
      rows,
    });
  } catch (error) {
    console.error("Error fetching legs:", error);
    return NextResponse.json(
      { error: "Failed to fetch legs" },
      { status: 500 }
    );
  }
}
