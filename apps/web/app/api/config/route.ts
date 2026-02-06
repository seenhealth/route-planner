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
    const driveTimeLimitMinutes = Number(body.driveTimeLimitMinutes);

    if (isNaN(driveTimeLimitMinutes) || driveTimeLimitMinutes < 15 || driveTimeLimitMinutes > 120) {
      return NextResponse.json(
        { error: "driveTimeLimitMinutes must be between 15 and 120" },
        { status: 400 }
      );
    }

    const config: AppConfig = { driveTimeLimitMinutes };
    await saveConfig(config);
    return NextResponse.json(config);
  } catch (err) {
    console.error("Error saving config:", err);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    );
  }
}
