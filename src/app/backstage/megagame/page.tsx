import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import SignIn from "../SignIn";
import { undoConfirmation } from "./actions";
import { loadPlayerRows } from "./data";
import { when } from "./format";
import ListAdder from "./ListAdder";
import { listHref, parsePlayerIds, withPlayer } from "./player-list";
import PlayerRows from "./PlayerRows";
import QuestCodeEntry from "./QuestCodeEntry";
import Section from "./Section";
import UndoForm from "./UndoForm";
import { toolAccess } from "@/lib/admin-auth";
import { normalizeMegagameCode } from "@/lib/megagame-rules";
import { findPlayerByCode, recentConfirmations } from "@/lib/megagame-store";
import { formatTicketCode } from "@/lib/ticket-code-format";

const TOOL = "/backstage/megagame";

export default async function MegagameHome(
  props: PageProps<"/backstage/megagame">,
) {
  await connection();
  const sp = await props.searchParams;
  const ids = parsePlayerIds(sp.players);
  const added = [sp.player].flat()[0];

  const access = await toolAccess("megagame.verify");
  if (!access) {
    const next = added
      ? `${TOOL}?player=${encodeURIComponent(added)}`
      : listHref(TOOL, ids);
    return <SignIn next={next} />;
  }

  // A badge's /p/<code> link lands here with ?player=<code>.
  let notice: string | null = null;
  if (added) {
    const player = await findPlayerByCode(added);
    if (player) redirect(listHref(TOOL, withPlayer(ids, player.id)));
    notice = `No player has code ${formatTicketCode(normalizeMegagameCode(added))}.`;
  }

  const [rows, recent, manager] = await Promise.all([
    loadPlayerRows(ids, null),
    recentConfirmations(access.userId),
    toolAccess("megagame.manage"),
  ]);

  return (
    <>
      <Section title="Open a quest">
        <QuestCodeEntry players={ids} />
        <p className="text-sm text-ink/60">
          Type the code on the quest label. The players below come along.
        </p>
      </Section>

      <Section
        title={`Players (${rows.length})`}
        aside={
          ids.length > 0 && (
            <Link
              href={TOOL}
              replace
              className="text-sm text-ink/60 underline underline-offset-2 hover:text-meeple"
            >
              Clear list
            </Link>
          )
        }
      >
        {notice && (
          <p role="alert" className="text-sm text-meeple">
            {notice}
          </p>
        )}
        <PlayerRows rows={rows} ids={ids} path={TOOL} />
        <ListAdder path={TOOL} ids={ids} />
      </Section>

      <Section title="Your recent confirmations">
        {recent.length === 0 ? (
          <p className="text-sm text-ink/60">None yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
            {recent.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`${TOOL}/q/${c.questCode}?c=${c.id}`}
                    className="min-w-0 truncate font-medium text-navy underline-offset-2 hover:text-meeple hover:underline"
                  >
                    {c.questTitle}
                  </Link>
                  <span className="shrink-0 text-sm text-ink/60">
                    {when(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-ink/70">
                  {c.players} {c.players === 1 ? "player" : "players"}
                  {c.voidedAt && " · undone"}
                </p>
                {!c.voidedAt && (
                  <UndoForm action={undoConfirmation} id={c.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="flex flex-col gap-3">
        <Link
          href={`${TOOL}/level`}
          className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
        >
          Record a level-up →
        </Link>
        {manager && (
          <Link
            href={`${TOOL}/quests`}
            className="font-semibold text-navy underline underline-offset-2 hover:text-meeple"
          >
            Import quests and download QR codes →
          </Link>
        )}
      </div>
    </>
  );
}
