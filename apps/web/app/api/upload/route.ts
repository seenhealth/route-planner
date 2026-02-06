import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { manifests, manifestRows } from "@/lib/db/schema";
import { parseManifestCSV } from "@/lib/csv-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const { rows, errors } = parseManifestCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in CSV", parseErrors: errors },
        { status: 400 }
      );
    }

    const manifestId = uuidv4();
    const jobDate = rows[0].jobDate;
    const uniquePassengers = new Set(rows.map((r) => r.idNumber)).size;

    // Insert manifest record
    await db.insert(manifests).values({
      id: manifestId,
      fileName: file.name,
      jobDate,
      uploadedAt: new Date().toISOString(),
      totalRows: rows.length,
      totalPassengers: uniquePassengers,
      status: "processing",
    });

    // Insert rows in batches to avoid oversized queries
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await db.insert(manifestRows).values(
        batch.map((row) => ({
          id: uuidv4(),
          manifestId,
          jobDate: row.jobDate,
          idNumber: row.idNumber,
          custName: row.custName,
          phone: row.phone,
          bookingPurpose: row.bookingPurpose,
          puAddr: row.puAddr,
          puUnit: row.puUnit,
          pickupCity: row.pickupCity,
          puState: row.puState,
          pickZip: row.pickZip,
          doAddr: row.doAddr,
          doUnit: row.doUnit,
          dropCity: row.dropCity,
          doState: row.doState,
          dropZip: row.dropZip,
          assistiveDevice: row.assistiveDevice,
          nTotalWheelChairs: row.nTotalWheelChairs,
          nTotalPassengers: row.nTotalPassengers,
          schPU: row.schPU,
          aptTime: row.aptTime,
          notes: row.notes,
          jobID: row.jobID,
          legType: row.legType,
        }))
      );
    }

    // Mark as ready
    await db
      .update(manifests)
      .set({ status: "ready" })
      .where(eq(manifests.id, manifestId));

    return NextResponse.json({
      id: manifestId,
      fileName: file.name,
      jobDate,
      totalRows: rows.length,
      totalPassengers: uniquePassengers,
      parseErrors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process CSV upload" },
      { status: 500 }
    );
  }
}
