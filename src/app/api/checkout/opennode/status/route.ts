import { NextResponse } from "next/server";
import { getCharge, isValidChargeId } from "@/lib/opennode";

// Reads the OpenNode key server-side — never expose it to the client.
export const runtime = "nodejs";

/** GET /api/checkout/opennode/status?id=<chargeId> → { status }. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  if (!isValidChargeId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const charge = await getCharge(id);
    return NextResponse.json({ status: charge.status });
  } catch (err) {
    console.error("[opennode-status] getCharge failed:", err);
    return NextResponse.json(
      { error: "Could not fetch charge status" },
      { status: 502 },
    );
  }
}
