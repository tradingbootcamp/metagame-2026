import { teamAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/** Whether the signed-in account has any team access; lets the static site nav show its admin link. */
export async function GET() {
  const admin = Boolean(await teamAccess());
  return Response.json({ admin }, { headers: { "Cache-Control": "no-store" } });
}
