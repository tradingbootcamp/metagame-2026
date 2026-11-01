import "server-only";
import {
  playerQuestStatus,
  type PlayerQuestStatus,
  type QuestWindow,
} from "@/lib/megagame-rules";
import {
  liveCompletions,
  playersByIds,
  type PlayerSummary,
} from "@/lib/megagame-store";
import { claimedCounts } from "@/lib/ticket-store";

export type PlayerRow = {
  player: PlayerSummary;
  status: PlayerQuestStatus;
  completion: { at: Date; by: string | null } | null;
};

/** The list's players with their status for a quest, or with no quest yet. */
export async function loadPlayerRows(
  ids: readonly string[],
  quest: (QuestWindow & { id: string }) | null,
): Promise<PlayerRow[]> {
  if (ids.length === 0) return [];
  const players = await playersByIds(ids);
  const found = players.map((p) => p.id);
  const [tickets, completions] = await Promise.all([
    claimedCounts(found),
    quest ? liveCompletions(quest.id, found) : Promise.resolve([]),
  ]);
  const done = new Map(completions.map((c) => [c.userId, c]));
  return players.map((player) => {
    const c = done.get(player.id);
    return {
      player,
      status: playerQuestStatus({
        quest: quest ?? { class: null },
        levels: player.levels,
        completed: c !== undefined,
        hasTicket: (tickets.get(player.id) ?? 0) > 0,
      }),
      completion: c ? { at: c.confirmedAt, by: c.confirmedByName } : null,
    };
  });
}
