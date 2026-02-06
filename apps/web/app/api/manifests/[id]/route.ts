import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manifests, manifestRows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const rows = await db
      .select()
      .from(manifestRows)
      .where(eq(manifestRows.manifestId, id));

    return NextResponse.json({
      ...manifest[0],
      rows,
    });
  } catch (error) {
    console.error("Error fetching manifest:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifest" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Delete rows first (cascade should handle this, but be explicit)
    await db.delete(manifestRows).where(eq(manifestRows.manifestId, id));
    await db.delete(manifests).where(eq(manifests.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting manifest:", error);
    return NextResponse.json(
      { error: "Failed to delete manifest" },
      { status: 500 }
    );
  }
}
