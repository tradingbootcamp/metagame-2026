"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getDb, schema } from "@/db";
import { currentSession, getAuth } from "@/lib/auth";

export type FirstSigninState = { error?: string; saved?: boolean };

const yesNo = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return v === "yes" ? true : v === "no" ? false : null;
};

export async function saveFirstSignin(
  _prev: FirstSigninState,
  formData: FormData,
): Promise<FirstSigninState> {
  const session = await currentSession();
  if (!session) return { error: "You've been signed out. Sign in again." };
  const isAdult = yesNo(formData, "isAdult");
  const bringingChildren = yesNo(formData, "bringingChildren");
  const preferredName = String(formData.get("preferredName") ?? "")
    .trim()
    .slice(0, 80);
  if (isAdult === null || bringingChildren === null || !preferredName)
    return { error: "Fill in the required fields." };

  const values = {
    isAdult,
    bringingChildren,
    preferredName,
    // People often type "@name"; Discord usernames can't contain "@".
    discordHandle:
      String(formData.get("discordHandle") ?? "")
        .trim()
        .replace(/^@+\s*/, "")
        .slice(0, 40) || null,
    isPublic: formData.get("isPublic") === "on",
    shareWithRecruiters: formData.get("shareWithRecruiters") === "on",
  };
  const { profiles } = schema;
  await getDb()
    .insert(profiles)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
  // One name for people; the account name mirrors it for admin lists and emails.
  if (preferredName !== session.user.name) {
    await getAuth().api.updateUser({
      body: { name: preferredName },
      headers: await headers(),
    });
  }
  revalidatePath("/account");
  return { saved: true };
}
