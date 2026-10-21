import { adminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Whether the signed-in account holds the admin role; lets the static site nav show its admin link. */
export async function GET() {
  const admin = Boolean(await adminSession());
  return Response.json({ admin }, { headers: { "Cache-Control": "no-store" } });
}
