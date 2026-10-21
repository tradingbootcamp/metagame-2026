import { spaceOptionLocations, updateRfpSession } from "@/lib/rfp-sessions";
import {
  findRfpSession,
  parseRfpSessionPatch,
  resolveAccount,
} from "@/lib/rfp-sessions-api";
import { authorize, error, failed, json, readBody } from "@/lib/schedule-api";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/sessions/[id]">;

/**
 * One session by id, slug or Airtable record id, plus the space
 * options a grade can suggest.
 */
export async function GET(_request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const [rfpSession, spaceOptions] = await Promise.all([
    findRfpSession((await ctx.params).id),
    spaceOptionLocations(),
  ]);
  return rfpSession
    ? json({ session: rfpSession, spaceOptions })
    : error("No such session.", 404);
}

/**
 * Changes only the fields given: phase, verdict, speakerTier,
 * shepherdUserId or shepherdEmail, and the RFP text columns.
 */
export async function PATCH(request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const patch = parseRfpSessionPatch(body);
  if (!patch.ok) return error(patch.error, 400, patch.field);
  const rfpSession = await findRfpSession((await ctx.params).id);
  if (!rfpSession) return error("No such session.", 404);

  const { shepherd, text, ...pipeline } = patch.value;
  let shepherdUserId: string | null | undefined;
  if (shepherd !== undefined) {
    shepherdUserId = shepherd === null ? null : await resolveAccount(shepherd);
    if (shepherdUserId === null && shepherd !== null) {
      return error(`No account for ${shepherd}.`, 400, "shepherd");
    }
  }

  try {
    await updateRfpSession(rfpSession.sessionId, {
      ...pipeline,
      ...(shepherdUserId !== undefined && { shepherdUserId }),
      text,
    });
  } catch (err) {
    return failed(err);
  }
  return json({ session: await findRfpSession(rfpSession.sessionId) });
}
