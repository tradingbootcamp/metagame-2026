import { parseGrade } from "@/lib/grade-input";
import { saveGrade, spaceOptionLocations } from "@/lib/rfp-sessions";
import {
  findRfpSession,
  namedGrader,
  resolveAccount,
} from "@/lib/rfp-sessions-api";
import { authorize, error, failed, json, readBody } from "@/lib/schedule-api";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/sessions/[id]/grade">;

/**
 * Saves a whole grade, replacing the grader's own row: fields left out are
 * cleared. The grader is the key's owner unless `graderUserId` or
 * `graderEmail` names someone else.
 */
export async function PUT(request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;

  const named = namedGrader(body);
  if (!named.ok) return error(named.error, 400, named.field);
  // Grading as someone else is for admins only. authorize() already requires
  // an admin, so this holds for every caller today; keep it if that changes.
  let graderUserId: string | null =
    access.via === "account" ? access.userId : null;
  if (named.value !== undefined) {
    graderUserId = await resolveAccount(named.value);
    if (!graderUserId) {
      return error(`No account for ${named.value}.`, 400, "grader");
    }
  }
  if (!graderUserId) {
    return error(
      "Signed in without an account: name the grader with graderUserId or graderEmail.",
      400,
      "grader",
    );
  }

  const spaces = await spaceOptionLocations();
  const grade = parseGrade(
    body,
    spaces.map((s) => s.id),
  );
  if (!grade.ok) return error(grade.error, 400, grade.field);
  const rfpSession = await findRfpSession((await ctx.params).id);
  if (!rfpSession) return error("No such session.", 404);

  try {
    await saveGrade(rfpSession.sessionId, graderUserId, grade.value);
  } catch (err) {
    return failed(err);
  }
  return json({ session: await findRfpSession(rfpSession.sessionId) });
}
