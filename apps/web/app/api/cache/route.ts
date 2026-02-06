import { NextRequest, NextResponse } from "next/server";
import { cacheClearByPrefix } from "@/lib/cache";

export async function DELETE(request: NextRequest) {
  const prefix = request.nextUrl.searchParams.get("prefix");
  if (!prefix || !["geocode", "directions"].includes(prefix)) {
    return NextResponse.json(
      { error: "Invalid prefix. Must be 'geocode' or 'directions'." },
      { status: 400 }
    );
  }

  const deleted = await cacheClearByPrefix(prefix);
  return NextResponse.json({ deleted, prefix });
}
