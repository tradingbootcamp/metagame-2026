import { cardBackground } from "@/lib/megagame-quests";
import { listQuests, questsByIds, type Quest } from "@/lib/megagame-store";
import { isUuid } from "../../megagame/uuid";

/** The print page's query contract: `?id=…&id=…`, else every active quest narrowed by `?class=`. */
export async function printQuests(
  params: URLSearchParams,
): Promise<{ quests: Quest[]; ids: string[] }> {
  const ids = [...new Set(params.getAll("id").filter(isUuid))];
  const cls = params.get("class") ?? "";
  const quests =
    ids.length > 0
      ? await questsByIds(ids)
      : (await listQuests()).filter(
          (q) => q.active && (!cls || cardBackground(q) === cls),
        );
  return { quests, ids };
}
