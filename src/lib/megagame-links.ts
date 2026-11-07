import "server-only";
import { can } from "./access";
import { currentSession } from "./auth";
import {
  isCompleteMegagameCode,
  normalizeMegagameCode,
} from "./megagame-rules";

// Where a quest label's printed /q/<code> QR link leads.

export type QuestLink =
  | { kind: "board"; href: string }
  | { kind: "note"; code: string | null; signInHref: string | null };

/** Volunteers go to the board; everyone else gets a note and never sees the quest. */
export async function resolveQuestLink(
  rawCode: string,
  players?: string | string[],
): Promise<QuestLink> {
  const code = normalizeMegagameCode(rawCode);
  const printable = isCompleteMegagameCode(code) ? code : null;
  const list = [players].flat()[0]?.trim();
  if (!(await currentSession())) {
    const keep = list ? `?${new URLSearchParams({ players: list })}` : "";
    return {
      kind: "note",
      code: printable,
      signInHref: `/login?next=${encodeURIComponent(`/q/${code}${keep}`)}`,
    };
  }
  if (await can("megagame.verify")) {
    const query = new URLSearchParams({ quest: code });
    if (list) query.set("players", list);
    return { kind: "board", href: `/backstage/megagame?${query}` };
  }
  return { kind: "note", code: printable, signInHref: null };
}
