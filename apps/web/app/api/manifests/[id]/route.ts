import { NextRequest, NextResponse } from "next/server";
import { getManifest, deleteManifest } from "@/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getManifest(id);
    if (!result) return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    return NextResponse.json(result.meta);
  } catch (error) {
    console.error("Error fetching manifest:", error);
    return NextResponse.json({ error: "Failed to fetch manifest" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteManifest(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting manifest:", error);
    return NextResponse.json({ error: "Failed to delete manifest" }, { status: 500 });
  }
}
