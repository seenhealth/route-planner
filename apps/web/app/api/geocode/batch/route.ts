import { NextRequest, NextResponse } from "next/server";
import { batchGeocodeAddresses } from "@/lib/geocode";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses } = body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "addresses must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    if (addresses.some((a: unknown) => typeof a !== "string")) {
      return NextResponse.json(
        { error: "all addresses must be strings" },
        { status: 400 }
      );
    }

    if (addresses.length > 100) {
      return NextResponse.json(
        { error: "maximum 100 addresses per batch" },
        { status: 400 }
      );
    }

    const results = await batchGeocodeAddresses(addresses);
    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
