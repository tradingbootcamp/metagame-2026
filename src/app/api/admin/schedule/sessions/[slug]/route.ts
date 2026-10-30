import {
  authorize,
  done,
  error,
  failed,
  json,
  readBody,
  resolveHosts,
  resolveShepherd,
  sessionBySlug,
  sessionToRaw,
} from "@/lib/schedule-api";
import { overlapWarning } from "@/lib/schedule";
import { parseSessionFields, type Raw } from "@/lib/schedule-input";
import { removeSession, upsertSession } from "@/lib/schedule-store";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/schedule/sessions/[slug]">;

export async function GET(_request: Request, ctx: Ctx) {
  const access = await authorize("schedule.view");
  if (access instanceof Response) return access;
  const session = await sessionBySlug((await ctx.params).slug);
  return session ? json({ session }) : error("No such session.", 404);
}

/** Replaces the session: fields left out are cleared, as the form would. */
export async function PUT(request: Request, ctx: Ctx) {
  return write(request, ctx, (body) => body);
}

/** Changes only the fields given; `hosts` or `shepherd` left out keeps it. */
export async function PATCH(request: Request, ctx: Ctx) {
  return write(request, ctx, (body, current) => ({ ...current, ...body }));
}

async function write(
  request: Request,
  ctx: Ctx,
  merge: (body: Raw, current: Raw) => Raw,
) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { slug } = await ctx.params;
  const current = await sessionBySlug(slug);
  if (!current) return error("No such session.", 404);

  // The path names the session; the body's slug, if any, renames it.
  const raw = merge({ slug, ...body }, sessionToRaw(current));
  const parsed = parseSessionFields(raw);
  if (!parsed.ok) return error(parsed.error, 400, parsed.field);
  const hosts = await resolveHosts(raw.hosts ?? []);
  if ("error" in hosts) return error(hosts.error, 400, hosts.field);
  const shepherd = await resolveShepherd(
    raw.shepherd,
    parsed.value.shepherdUserId,
  );
  if ("error" in shepherd) return error(shepherd.error, 400, shepherd.field);

  let saved;
  try {
    saved = await upsertSession({
      id: current.id,
      ...parsed.value,
      hostIds: hosts.ids,
      shepherdUserId: shepherd.id,
    });
  } catch (err) {
    return failed(err);
  }
  done();
  return json({
    session: await sessionBySlug(parsed.value.slug),
    warnings: saved.clash ? [overlapWarning(saved.clash)] : [],
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const session = await sessionBySlug((await ctx.params).slug);
  if (!session) return error("No such session.", 404);
  try {
    await removeSession(session.id);
  } catch (err) {
    return failed(err);
  }
  done();
  return json({ ok: true });
}
