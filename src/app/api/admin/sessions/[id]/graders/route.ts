import { assignGrader, unassignGrader } from "@/lib/rfp-sessions";
import {
  findRfpSession,
  inPipeline,
  namedGrader,
  NOT_IN_PIPELINE,
  resolveGrader,
} from "@/lib/rfp-sessions-api";
import { authorize, error, failed, json, readBody } from "@/lib/schedule-api";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/sessions/[id]/graders">;

async function target(request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const unknown = Object.keys(body).find(
    (k) => k !== "graderUserId" && k !== "graderEmail",
  );
  if (unknown) return error(`Unknown field ${unknown}.`, 400, unknown);
  const named = namedGrader(body);
  if (!named.ok) return error(named.error, 400, named.field);
  if (named.value === undefined) {
    return error(
      "Name the grader with graderUserId or graderEmail.",
      400,
      "graderUserId",
    );
  }
  const grader = await resolveGrader(named.value);
  if ("error" in grader) return error(grader.error, 400, "graderUserId");
  const rfpSession = await findRfpSession((await ctx.params).id);
  if (!rfpSession) return error("No such session.", 404);
  if (!inPipeline(rfpSession)) return error(NOT_IN_PIPELINE, 409);
  return { sessionId: rfpSession.sessionId, userId: grader.userId };
}

/** Assigns a committee member to grade: an unsubmitted grade row. A no-op if they have one. */
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

/** Takes back an assignment: 404 without one, 409 once the grade is submitted. */
export async function DELETE(request: Request, ctx: Ctx) {
  const t = await target(request, ctx);
  if (t instanceof Response) return t;
  try {
    const result = await unassignGrader(t.sessionId, t.userId);
    if (result === "missing") {
      return error("That grader isn't assigned.", 404);
    }
    if (result === "submitted") {
      return error("That grade is submitted; it can't be unassigned.", 409);
    }
  } catch (err) {
    return failed(err);
  }
  return json({ session: await findRfpSession(t.sessionId) });
}
