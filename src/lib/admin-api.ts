// Plumbing shared by every JSON route under /api/admin: the permission gate,
// body parsing and the {error, field} response shape. No domain imports.

import { headers } from "next/headers";
import { requireAccess, type Access } from "./admin-auth";
import { API_KEY_HEADER, getAuth } from "./auth";
import type { Permission } from "./permissions";

/** A loose record: FormData entries or a JSON body. */
export type Raw = Record<string, unknown>;

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status });

export const error = (message: string, status: number, field?: string) =>
  json({ error: message, ...(field && { field }) }, status);

export const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

/** A trimmed string field of a JSON body; anything else is "". */
export const str = (body: Raw, key: string) => {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
};

/**
 * The caller when they hold `permission`, else the 401/403 to send. Accepts
 * a browser session too, so a team member can hit GET from the address bar.
 */
export async function authorize(
  permission: Permission = "schedule.manage",
): Promise<Access | Response> {
  const access = await requireAccess(permission);
  if (access) return access;
  const key = (await headers()).get(API_KEY_HEADER);
  if (!key) return error(`Send an API key in ${API_KEY_HEADER}.`, 401);
  const { valid } = await getAuth().api.verifyApiKey({ body: { key } });
  return valid
    ? error(`That key's account doesn't hold ${permission}.`, 403)
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
