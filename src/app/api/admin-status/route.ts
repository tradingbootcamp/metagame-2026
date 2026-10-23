import { teamAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/** Whether the signed-in account holds a team-tool permission; lets the static site nav show its admin link. */
export async function GET() {
  const admin = Boolean((await teamAccess())?.team);
  return Response.json({ admin }, { headers: { "Cache-Control": "no-store" } });
}
