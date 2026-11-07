import { connection } from "next/server";
import SignIn from "../../SignIn";
import QuestTable, { type QuestRow } from "./QuestTable";
import { toolAccess } from "@/lib/admin-auth";
import { CLASS_LABELS, isMegagameClass } from "@/lib/megagame-levels";
import { cardBackground, stampList, stampsOf } from "@/lib/megagame-quests";
import {
  completionCountsByQuest,
  listQuests,
  type Quest,
} from "@/lib/megagame-store";
import { formatTicketCode } from "@/lib/ticket-code-format";

const first = (v: string | string[] | undefined) => [v].flat()[0] ?? "";

export default async function QuestList(props: PageProps<"/backstage/quests">) {
  await connection();
  const sp = await props.searchParams;
  if (!(await toolAccess("megagame.manage")))
    return <SignIn next="/backstage/quests" />;

  const [quests, completions] = await Promise.all([
    listQuests(),
    completionCountsByQuest(),
  ]);
  const rows = quests.map((quest) =>
    toRow(quest, completions.get(quest.id) ?? 0),
  );

  return (
    <div className="flex flex-col gap-6">
      {first(sp.deleted) && (
        <p role="status" className="text-sm text-moss">
          Quest deleted.
        </p>
      )}
      <QuestTable rows={rows} />
    </div>
  );
}

function needs(quest: Quest): string {
  const parts = [`${quest.minPlayers}+ players`];
  if (quest.class && isMegagameClass(quest.class)) {
    const window =
      quest.minLevel !== null && quest.maxLevel !== null
        ? `Lv ${quest.minLevel}–${quest.maxLevel}`
        : quest.minLevel !== null
          ? `Lv ${quest.minLevel}+`
          : quest.maxLevel !== null
            ? `Lv ≤${quest.maxLevel}`
            : "";
    parts.push(`${CLASS_LABELS[quest.class]} ${window}`.trim());
  }
  return parts.join(", ");
}

function toRow(quest: Quest, completions: number): QuestRow {
  const stamps = stampList(stampsOf(quest));
  const row = {
    id: quest.id,
    code: formatTicketCode(quest.code),
    title: quest.title,
    background: cardBackground(quest),
    needs: needs(quest),
    stamps:
      stamps.length === 0
        ? "—"
        : stamps.map((s) => `${s.n} ${s.class}`).join(", "),
    pictures: `${quest.bodyImages.length}${quest.evidenceImage ? " + evidence" : ""}`,
    completions,
    active: quest.active,
    noEvidence: !quest.evidence && !quest.evidenceImage,
  };
  return {
    ...row,
    haystack: [
      row.code,
      quest.code,
      row.title,
      quest.bodyText,
      row.background,
      row.needs,
      row.stamps,
      row.noEvidence ? "no evidence" : "",
    ]
      .join(" ")
      .toLowerCase(),
  };
}
