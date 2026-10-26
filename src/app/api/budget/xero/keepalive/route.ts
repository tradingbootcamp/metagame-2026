import { env } from "@/env";
import { keepAlive } from "@/lib/xero";

export const dynamic = "force-dynamic";

/** Weekly Vercel cron: a refresh keeps the 60-day Xero refresh token alive. */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await keepAlive());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[xero keepalive]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
