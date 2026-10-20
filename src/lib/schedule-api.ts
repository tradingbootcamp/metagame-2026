// Plumbing for the JSON API under /api/admin/schedule: the admin gate, body
// parsing, host resolution and error responses. The routes themselves are
// thin wrappers over schedule-store.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin, type NamedAccess } from "./admin-auth";
import { API_KEY_HEADER, getAuth } from "./auth";
import { toPacificWall, type ScheduleSession } from "./schedule";
import { type Invalid, type Raw } from "./schedule-input";
import {
  ensureAccount,
  explainDbError,
  findAccount,
  loadSchedule,
} from "./schedule-store";

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status });

export const error = (message: string, status: number, field?: string) =>
  json({ error: message, ...(field && { field }) }, status);

/**
 * The caller when they're an admin, else the 401/403 to send. Accepts a
 * browser session too, so an admin can hit GET from the address bar.
 */
export async function authorize(): Promise<NamedAccess | Response> {
  const access = await requireAdmin();
  if (access) return access;
  const key = (await headers()).get(API_KEY_HEADER);
  if (!key) return error(`Send an API key in ${API_KEY_HEADER}.`, 401);
  const { valid } = await getAuth().api.verifyApiKey({ body: { key } });
  return valid
    ? error("That key's account isn't an admin.", 403)
    : error("Invalid API key.", 401);
}

export async function readBody(request: Request): Promise<Raw | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Body must be JSON.", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return error("Body must be a JSON object.", 400);
  }
  return body as Raw;
}

/** `explainDbError` as a response: a constraint is the caller's fault. */
export function failed(err: unknown): Response {
  const { field, error: message } = explainDbError(err);
  return error(message, field ? 400 : 500, field);
}

export function done() {
  revalidatePath("/admin/schedule");
}

export type HostInput = { email: string; name?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Host user ids, lead first, from `{email, name?}` entries. An unknown email
 * needs a name, which makes the account (as the form's "add someone" does).
 */
export async function resolveHosts(
  input: unknown,
): Promise<{ ids: string[] } | Invalid> {
  if (!Array.isArray(input)) {
    return { field: "hosts", error: "hosts must be a list of {email, name}." };
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of input) {
    const { email, name } = parseHost(entry);
    if (!email || !EMAIL.test(email)) {
      return { field: "hosts", error: "Each host needs a valid email." };
    }
    if (seen.has(email)) continue;
    seen.add(email);
    let account = await findAccount(email);
    if (!account) {
      if (!name) {
        return {
          field: "hosts",
          error: `No account for ${email}; give a name to create one.`,
        };
      }
      account = await ensureAccount(name, email);
    }
    ids.push(account.userId);
  }
  return { ids };
}

function parseHost(entry: unknown): { email: string; name: string } {
  if (!entry || typeof entry !== "object") return { email: "", name: "" };
  const { email, name } = entry as Record<string, unknown>;
  return {
    email: typeof email === "string" ? email.trim().toLowerCase() : "",
    name: typeof name === "string" ? name.trim() : "",
  };
}

export async function sessionBySlug(
  slug: string,
): Promise<ScheduleSession | null> {
  const { sessions } = await loadSchedule();
  return sessions.find((s) => s.slug === slug) ?? null;
}

/** A stored session as the API takes it, so a PATCH can merge over it. */
export function sessionToRaw(session: ScheduleSession): Raw {
  const { hosts, startsAt, endsAt, ...rest } = session;
  return {
    ...rest,
    startsAt: startsAt && toPacificWall(startsAt),
    endsAt: endsAt && toPacificWall(endsAt),
    hosts: hosts.map(({ email, name }) => ({ email, name })),
  };
}
