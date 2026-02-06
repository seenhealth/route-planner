import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { uploadManifest } from "@/lib/db";
import { parseManifestCSV } from "@/lib/csv-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.name.endsWith(".csv")) return NextResponse.json({ error: "File must be a CSV" }, { status: 400 });

    const csvText = await file.text();
    const { rows, errors } = parseManifestCSV(csvText);
    if (rows.length === 0) return NextResponse.json({ error: "No valid rows", parseErrors: errors }, { status: 400 });

    const id = uuidv4();
    const jobDate = rows[0].jobDate;
    const meta = await uploadManifest(id, file.name, jobDate, csvText);

    return NextResponse.json({ ...meta, parseErrors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to process CSV upload" }, { status: 500 });
  }
}
