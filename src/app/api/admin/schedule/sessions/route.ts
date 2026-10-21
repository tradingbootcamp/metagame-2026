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
} from "@/lib/schedule-api";
import { parseSessionFields } from "@/lib/schedule-input";
import { sessionIdBySlug, upsertSession } from "@/lib/schedule-store";

export const dynamic = "force-dynamic";

/** Creates a session; the slug comes from the title unless given. */
export async function POST(request: Request) {
  const access = await authorize();
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;

  const parsed = parseSessionFields(body);
  if (!parsed.ok) return error(parsed.error, 400, parsed.field);
  const hosts = await resolveHosts(body.hosts ?? []);
  if ("error" in hosts) return error(hosts.error, 400, hosts.field);
  const shepherd = await resolveShepherd(
    body.shepherd,
    parsed.value.shepherdUserId,
  );
  if ("error" in shepherd) return error(shepherd.error, 400, shepherd.field);
  if (await sessionIdBySlug(parsed.value.slug)) {
    return error("Another session has that slug.", 409, "slug");
  }

  try {
    await upsertSession({
      ...parsed.value,
      hostIds: hosts.ids,
      shepherdUserId: shepherd.id,
    });
  } catch (err) {
    return failed(err);
  }
  done();
  return json({ session: await sessionBySlug(parsed.value.slug) }, 201);
}
