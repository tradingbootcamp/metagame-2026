"use server";

import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { currentSession } from "@/lib/auth";
import { cleanDiscordHandle } from "@/lib/discord-handle";

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
  if (isAdult === null || bringingChildren === null)
    return { error: "Answer both required questions." };

  const values = {
    isAdult,
    bringingChildren,
    preferredName:
      String(formData.get("preferredName") ?? "")
        .trim()
        .slice(0, 80) || null,
    discordHandle:
      cleanDiscordHandle(String(formData.get("discordHandle") ?? ""))?.slice(
        0,
        40,
      ) ?? null,
    isPublic: formData.get("isPublic") === "on",
    shareWithRecruiters: formData.get("shareWithRecruiters") === "on",
  };
  const { profiles } = schema;
  await getDb()
    .insert(profiles)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
  revalidatePath("/account");
  return { saved: true };
}
