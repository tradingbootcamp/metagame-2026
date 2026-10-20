import {
  authorize,
  done,
  error,
  failed,
  json,
  readBody,
  sessionBySlug,
} from "@/lib/schedule-api";
import {
  cancelRsvp,
  ensureAccount,
  findAccount,
  rsvp,
} from "@/lib/schedule-store";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/schedule/sessions/[slug]/rsvps">;

/**
 * The session and the account named by `{email, name?}`. With `create`, an
 * unknown email plus a name makes the account, like the form's walk-up flow.
 */
async function target(request: Request, ctx: Ctx, create: boolean) {
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const session = await sessionBySlug((await ctx.params).slug);
  if (!session) return error("No such session.", 404);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return error("Required.", 400, "email");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  let account = await findAccount(email);
  if (!account && create && name) account = await ensureAccount(name, email);
  if (!account) return error(`No account for ${email}.`, 404, "email");
  return { session, account };
}

/** RSVPs the account; waitlists them when the session is full. */
export async function POST(request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const t = await target(request, ctx, true);
  if (t instanceof Response) return t;
  try {
    const status = await rsvp(t.session.id, t.account.userId);
    done();
    return json({ status });
  } catch (err) {
    return failed(err);
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const t = await target(request, ctx, false);
  if (t instanceof Response) return t;
  try {
    await cancelRsvp(t.session.id, t.account.userId);
  } catch (err) {
    return failed(err);
  }
  done();
  return json({ ok: true });
}
