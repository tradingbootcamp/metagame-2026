import "server-only";
import { can } from "./access";
import { currentSession } from "./auth";
import type { MegagameLevels } from "./megagame-levels";
import { normalizeMegagameCode } from "./megagame-rules";
import { findPlayerByCode } from "./megagame-store";

// Where the printed /q/<code> and /p/<code> QR links lead. Each route has its
// own rule, since a badge page must stay open to everyone.

/** The redirect for a quest label's link. Nobody without the permission sees the quest. */
export async function questLinkTarget(rawCode: string): Promise<string> {
  const code = normalizeMegagameCode(rawCode);
  if (!(await currentSession())) {
    return `/login?next=${encodeURIComponent(`/q/${code}`)}`;
  }
  if (await can("megagame.verify")) return `/backstage/megagame/q/${code}`;
  return "/account";
}

export type PublicPlayer = { name: string; levels: MegagameLevels };

/** A volunteer adds the player to their list; anyone else sees name and levels. */
export async function playerLinkTarget(
  rawCode: string,
): Promise<{ redirect: string } | { player: PublicPlayer | null }> {
  const code = normalizeMegagameCode(rawCode);
  if (await can("megagame.verify")) {
    return { redirect: `/backstage/megagame?player=${code}` };
  }
  const found = await findPlayerByCode(code);
  return {
    player: found ? { name: found.name, levels: found.levels } : null,
  };
}
