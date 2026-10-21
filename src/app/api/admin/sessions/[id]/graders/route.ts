import { assignGrader, unassignGrader } from "@/lib/rfp-sessions";
import {
  findRfpSession,
  namedGrader,
  resolveAccount,
} from "@/lib/rfp-sessions-api";
import { authorize, error, failed, json, readBody } from "@/lib/schedule-api";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/sessions/[id]/graders">;

async function target(request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const named = namedGrader(body);
  if (!named.ok) return error(named.error, 400, named.field);
  if (named.value === undefined) {
    return error("Name the grader with graderUserId or graderEmail.", 400);
  }
  const userId = await resolveAccount(named.value);
  if (!userId) return error(`No account for ${named.value}.`, 400, "grader");
  const rfpSession = await findRfpSession((await ctx.params).id);
  if (!rfpSession) return error("No such session.", 404);
  return { sessionId: rfpSession.sessionId, userId };
}

/** Assigns a grader: an unsubmitted grade row. A no-op if they have one. */
export async function POST(request: Request, ctx: Ctx) {
  const t = await target(request, ctx);
  if (t instanceof Response) return t;
  try {
    await assignGrader(t.sessionId, t.userId);
  } catch (err) {
    return failed(err);
  }
  return json({ session: await findRfpSession(t.sessionId) });
}

/** Takes back an assignment; a submitted grade is kept (409). */
export async function DELETE(request: Request, ctx: Ctx) {
  const t = await target(request, ctx);
  if (t instanceof Response) return t;
  try {
    if (!(await unassignGrader(t.sessionId, t.userId))) {
      return error("No unsubmitted assignment for that grader.", 409);
    }
  } catch (err) {
    return failed(err);
  }
  return json({ session: await findRfpSession(t.sessionId) });
}
