"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { currentSession, getAuth, hasPassword } from "@/lib/auth";

export type FormState = { error?: string; saved?: boolean };

async function requireSession() {
  const session = await currentSession();
  if (!session) redirect("/login?next=/account");
  return session;
}

const text = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "")
    .trim()
    .slice(0, max) || null;

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  if (!name) return { error: "Enter your name." };

  const values = {
    preferredName: text(formData, "preferredName", 80),
    pronouns: text(formData, "pronouns", 40),
    discordHandle: text(formData, "discordHandle", 40),
    bio: text(formData, "bio", 1000),
    isPublic: formData.get("isPublic") === "on",
  };

  if (name !== session.user.name) {
    await getAuth().api.updateUser({
      body: { name },
      headers: await headers(),
    });
  }
  const { profiles } = schema;
  await getDb()
    .insert(profiles)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });

  revalidatePath("/account");
  return { saved: true };
}

export async function savePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) return { error: "Use at least 8 characters." };
  if (newPassword !== String(formData.get("confirm") ?? "")) {
    return { error: "The passwords don't match." };
  }

  const auth = getAuth();
  const requestHeaders = await headers();
  try {
    if (await hasPassword(session.user.id)) {
      await auth.api.changePassword({
        body: {
          currentPassword: String(formData.get("currentPassword") ?? ""),
          newPassword,
          revokeOtherSessions: true,
        },
        headers: requestHeaders,
      });
    } else {
      await auth.api.setPassword({
        body: { newPassword },
        headers: requestHeaders,
      });
    }
  } catch (e) {
    if (e instanceof APIError && e.body?.code === "INVALID_PASSWORD") {
      return { error: "Your current password is wrong." };
    }
    throw e;
  }

  revalidatePath("/account");
  return { saved: true };
}

export async function signOut(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}
