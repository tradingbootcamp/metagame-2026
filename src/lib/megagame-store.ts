import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { NO_LEVELS, type MegagameLevels } from "./megagame-levels";

export async function loadMegagameLevels(
  userId: string,
): Promise<MegagameLevels> {
  const { user } = schema;
  const [row] = await getDb()
    .select({
      wizard: user.wizardLevel,
      pirate: user.pirateLevel,
      alien: user.alienLevel,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? NO_LEVELS;
}

/** Callers check the levels are in range; the columns' checks back that up. */
export async function setMegagameLevels(
  userId: string,
  levels: MegagameLevels,
): Promise<void> {
  const { user } = schema;
  await getDb()
    .update(user)
    .set({
      wizardLevel: levels.wizard,
      pirateLevel: levels.pirate,
      alienLevel: levels.alien,
    })
    .where(eq(user.id, userId));
}
