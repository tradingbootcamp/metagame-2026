import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { NO_LEVELS, type MegagameLevels } from "./megagame-levels";

/**
 * Several accounts' levels at once, by user id (the home page's speakers).
 * Ids with no profile row are left out of the map.
 */
export async function loadMegagameLevelsFor(
  userIds: string[],
): Promise<Map<string, MegagameLevels>> {
  const out = new Map<string, MegagameLevels>();
  if (userIds.length === 0) return out;
  const { profiles } = schema;
  const rows = await getDb()
    .select({
      id: profiles.userId,
      wizard: profiles.wizardLevel,
      pirate: profiles.pirateLevel,
      alien: profiles.alienLevel,
    })
    .from(profiles)
    .where(inArray(profiles.userId, userIds));
  for (const { id, ...levels } of rows) out.set(id, levels);
  return out;
}

export async function loadMegagameLevels(
  userId: string,
): Promise<MegagameLevels> {
  const levels = await loadMegagameLevelsFor([userId]);
  return levels.get(userId) ?? NO_LEVELS;
}

/** Callers check the levels are in range; the columns' checks back that up. */
export async function setMegagameLevels(
  userId: string,
  levels: MegagameLevels,
): Promise<void> {
  const { profiles } = schema;
  const values = {
    wizardLevel: levels.wizard,
    pirateLevel: levels.pirate,
    alienLevel: levels.alien,
  };
  await getDb()
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
}
