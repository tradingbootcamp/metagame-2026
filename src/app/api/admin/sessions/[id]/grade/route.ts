import { gradeBody, parseGrade } from "@/lib/grade-input";
import { saveGrade, spaceOptionLocations } from "@/lib/rfp-sessions";
import {
  findRfpSession,
  inPipeline,
  namedGrader,
  NOT_IN_PIPELINE,
  resolveGrader,
} from "@/lib/rfp-sessions-api";
import { authorize, error, failed, json, readBody } from "@/lib/schedule-api";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/sessions/[id]/grade">;

/**
 * Saves a whole grade, replacing the grader's own row: fields left out are
 * cleared. The grader is the key's owner unless `graderUserId` or
 * `graderEmail` names another committee member.
 */
export async function PUT(request: Request, ctx: Ctx) {
  return save(request, ctx, "replace");
}

/**
 * Edits the grader's existing grade: only the fields given change. 404 when
 * they have no grade yet; PUT a whole one instead.
 */
export async function PATCH(request: Request, ctx: Ctx) {
  return save(request, ctx, "merge");
}

async function save(request: Request, ctx: Ctx, mode: "replace" | "merge") {
  const access = await authorize();
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;

  const named = namedGrader(body);
  if (!named.ok) return error(named.error, 400, named.field);
  // Grading as someone else is for admins only. authorize() already requires
  // an admin, so this holds for every caller today; keep it if that changes.
  const ref =
    named.value ?? (access.via === "account" ? access.userId : undefined);
  if (ref === undefined) {
    return error(
      "Signed in without an account: name the grader with graderUserId or graderEmail.",
      400,
      "graderUserId",
    );
  }
  const grader = await resolveGrader(ref);
  if ("error" in grader) return error(grader.error, 400, "graderUserId");

  const rfpSession = await findRfpSession((await ctx.params).id);
  if (!rfpSession) return error("No such session.", 404);
  if (!inPipeline(rfpSession)) return error(NOT_IN_PIPELINE, 409);

  let full = body;
  if (mode === "merge") {
    const existing = rfpSession.grades.find(
      (g) => g.grader.userId === grader.userId,
    );
    if (!existing) {
      return error("No grade from that grader yet; PUT a whole one.", 404);
    }
    full = {
      ...gradeBody(
        existing,
        existing.spaceOptions.map((s) => s.locationId),
      ),
      ...body,
    };
  }

  const spaces = await spaceOptionLocations();
  const grade = parseGrade(
    full,
    spaces.map((s) => s.id),
  );
  if (!grade.ok) return error(grade.error, 400, grade.field);

  try {
    await saveGrade(rfpSession.sessionId, grader.userId, grade.value);
  } catch (err) {
    return failed(err);
  }
  return json({ session: await findRfpSession(rfpSession.sessionId) });
}
