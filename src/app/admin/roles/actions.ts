"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/access";
import * as store from "@/lib/permission-store";
import { isPermission } from "@/lib/permissions";

export type Result = { error?: string };

const PATH = "/admin/roles";
const NAME_MAX = 40;

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

function cleanName(raw: string): string | Result {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Give the role a name." };
  if (name.length > NAME_MAX)
    return { error: `At most ${NAME_MAX} characters.` };
  return name;
}

async function run(work: () => Promise<void>): Promise<Result> {
  if (!(await can("users.manage")))
    return { error: "Sign in with an account that manages users." };
  try {
    await work();
  } catch (err) {
    const text = message(err);
    return {
      error: /unique|duplicate/i.test(text)
        ? "A role with that name already exists."
        : text,
    };
  }
  revalidatePath(PATH);
  return {};
}

export async function createRole(name: string): Promise<Result> {
  const clean = cleanName(name);
  if (typeof clean !== "string") return clean;
  return run(() => store.createRole(clean));
}

export async function renameRole(id: string, name: string): Promise<Result> {
  const clean = cleanName(name);
  if (typeof clean !== "string") return clean;
  return run(() => store.renameRole(id, clean));
}

export async function deleteRole(id: string): Promise<Result> {
  return run(() => store.deleteRole(id));
}

export async function setRolePermission(
  roleId: string,
  permission: string,
  granted: boolean,
): Promise<Result> {
  if (!isPermission(permission)) return { error: "Unknown permission." };
  return run(() => store.setRolePermission(roleId, permission, granted));
}
