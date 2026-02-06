import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/db";
import type { AppConfig } from "@/lib/db";

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (err) {
    console.error("Error reading config:", err);
    return NextResponse.json(
      { error: "Failed to read config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await getConfig();

    // Merge: only override fields that are provided
    if (body.driveTimeLimitMinutes !== undefined) {
      const val = Number(body.driveTimeLimitMinutes);
      if (isNaN(val) || val < 15 || val > 120) {
        return NextResponse.json(
          { error: "driveTimeLimitMinutes must be between 15 and 120" },
          { status: 400 }
        );
      }
      current.driveTimeLimitMinutes = val;
    }

    if (body.timeWindowBufferMinutes !== undefined) {
      const val = Number(body.timeWindowBufferMinutes);
      if (isNaN(val) || val < 15 || val > 180) {
        return NextResponse.json(
          { error: "timeWindowBufferMinutes must be between 15 and 180" },
          { status: 400 }
        );
      }
      current.timeWindowBufferMinutes = val;
    }

    await saveConfig(current);
    return NextResponse.json(current);
  } catch (err) {
    console.error("Error saving config:", err);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    );
  }
}
