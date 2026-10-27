import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { currentSession } from "@/lib/auth";
import { publicProfile, type PublicProfile } from "@/lib/user-profile";

const EMPTY = {
  pronouns: null,
  bio: null,
  website: null,
  imageUrl: null,
};

export type ProfileView = {
  profile: PublicProfile;
  /** The owner looking at their own page before they've made it public. */
  preview: boolean;
};

/**
 * The public profile for `id`, or null when there is nothing to show. Its own
 * owner gets a preview of the page while `isPublic` is still off; for anyone
 * else a hidden profile is indistinguishable from an account that isn't
 * there, so nothing on this route confirms an email has an account.
 */
export const loadProfileView = cache(
  async (id: string): Promise<ProfileView | null> => {
    const [row] = await getDb()
      .select({ user: schema.user, profile: schema.profiles })
      .from(schema.user)
      .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.user.id))
      .where(eq(schema.user.id, id))
      .limit(1);
    if (!row) return null;
    const profile = publicProfile(row);
    if (profile) return { profile, preview: false };

    const viewer = await currentSession();
    if (viewer?.user.id !== id || row.user.banned) return null;
    const own = publicProfile({
      user: row.user,
      profile: { ...(row.profile ?? EMPTY), isPublic: true },
    });
    return own && { profile: own, preview: true };
  },
);
