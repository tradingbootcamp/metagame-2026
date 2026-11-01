import Link from "next/link";
import { connection } from "next/server";
import SignIn from "../../../SignIn";
import { undoCompletion, undoConfirmation } from "../../actions";
import AnswerChecker from "../../AnswerChecker";
import ConfirmForm from "../../ConfirmForm";
import { loadPlayerRows } from "../../data";
import ListAdder from "../../ListAdder";
import { listHref, parsePlayerIds } from "../../player-list";
import PlayerRows from "../../PlayerRows";
import Section from "../../Section";
import UndoForm from "../../UndoForm";
import { isUuid } from "../../uuid";
import { windowText } from "../../format";
import { toolAccess } from "@/lib/admin-auth";
import { CLASS_LABELS, isMegagameClass } from "@/lib/megagame-levels";
import { normalizeMegagameCode } from "@/lib/megagame-rules";
import {
  confirmationOutcome,
  findQuestByCode,
  liveCompletions,
  playersByIds,
  type Quest,
} from "@/lib/megagame-store";
import { formatTicketCode } from "@/lib/ticket-code-format";

const TOOL = "/backstage/megagame";
const LINK =
  "font-semibold text-navy underline underline-offset-2 hover:text-meeple";

export default async function QuestPage(
  props: PageProps<"/backstage/megagame/q/[code]">,
) {
  await connection();
  const code = normalizeMegagameCode((await props.params).code);
  const sp = await props.searchParams;
  const ids = parsePlayerIds(sp.players);
  const confirmationId = [sp.c].flat()[0];
  const path = `${TOOL}/q/${code}`;

  const access = await toolAccess("megagame.verify");
  if (!access) {
    const keep: Record<string, string> = isUuid(confirmationId)
      ? { c: confirmationId }
      : {};
    return <SignIn next={listHref(path, ids, keep)} />;
  }

  const quest = await findQuestByCode(code);
  if (!quest) {
    return (
      <Section title="Quest not found">
        <p className="text-ink/80">
          No quest has code {formatTicketCode(code)}. Check the label and try
          again.
        </p>
        <Link href={listHref(TOOL, ids)} className={LINK}>
          ← Back
        </Link>
      </Section>
    );
  }

  const facts = [
    quest.class && isMegagameClass(quest.class)
      ? CLASS_LABELS[quest.class]
      : quest.class
        ? quest.class
        : "Any class",
    windowText(quest),
    formatTicketCode(quest.code),
  ].filter(Boolean);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-bebas text-3xl tracking-wide text-navy">
          {quest.title}
        </h1>
        <p className="text-sm text-ink/70">{facts.join(" · ")}</p>
        {!quest.active && (
          <p role="alert" className="text-sm font-semibold text-meeple">
            This quest is marked inactive.
          </p>
        )}
        {quest.hint && (
          <p className="text-sm text-ink/70">Hint for players: {quest.hint}</p>
        )}
      </header>

      {isUuid(confirmationId) ? (
        <ConfirmationResult
          id={confirmationId}
          quest={quest}
          path={path}
          userId={access.userId}
        />
      ) : (
        <CheckAndConfirm quest={quest} ids={ids} path={path} />
      )}
    </>
  );
}

async function CheckAndConfirm({
  quest,
  ids,
  path,
}: {
  quest: Quest;
  ids: string[];
  path: string;
}) {
  const rows = await loadPlayerRows(ids, quest);
  const recordable = rows
    .filter((r) => r.status.kind === "ok")
    .map((r) => r.player.id);
  return (
    <>
      <Section title="Check">
        {quest.kind === "evidence" ? (
          <div className="rounded-xl border border-line bg-white p-4">
            <p className="text-sm font-medium text-ink/80">
              Look for evidence that
            </p>
            <p className="mt-1 text-lg text-ink">
              {quest.evidence || "No description given."}
            </p>
          </div>
        ) : (
          <AnswerChecker questCode={quest.code} answers={quest.answers} />
        )}
      </Section>

      <Section title={`Players (${rows.length})`}>
        <PlayerRows rows={rows} ids={ids} path={path} />
        <ListAdder path={path} ids={ids} />
      </Section>

      <ConfirmForm
        id={crypto.randomUUID()}
        questId={quest.id}
        questCode={quest.code}
        players={recordable}
      />
    </>
  );
}

async function ConfirmationResult({
  id,
  quest,
  path,
  userId,
}: {
  id: string;
  quest: Quest;
  path: string;
  userId: string;
}) {
  const outcome = await confirmationOutcome(id);
  if (!outcome || outcome.confirmation.questId !== quest.id) {
    return (
      <Section title="Confirmation not found">
        <Link href={path} className={LINK}>
          Start a group for this quest →
        </Link>
      </Section>
    );
  }
  const { confirmation } = outcome;
  const canManage = Boolean(await toolAccess("megagame.manage"));
  const mayUndo = confirmation.confirmedBy === userId || canManage;
  const players = await playersByIds(confirmation.requestedUserIds);
  const name = new Map(players.map((p) => [p.id, p.name]));
  const nameOf = (uid: string) => name.get(uid) ?? "Deleted account";

  if (outcome.status === "voided") {
    return (
      <Section title="Undone">
        <p className="text-ink/80">
          This confirmation was undone
          {confirmation.voidReason ? `: ${confirmation.voidReason}` : "."}
        </p>
        <Link href={path} className={LINK}>
          Start a new group →
        </Link>
      </Section>
    );
  }

  const completionIds = canManage
    ? new Map(
        (await liveCompletions(quest.id, outcome.recorded))
          .filter((c) => c.confirmationId === id)
          .map((c) => [c.userId, c.id]),
      )
    : new Map<string, string>();

  return (
    <Section title="Recorded">
      {outcome.recorded.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
          {outcome.recorded.map((uid) => (
            <li key={uid} className="flex flex-col gap-2 p-3">
              <span className="font-medium text-navy">{nameOf(uid)}</span>
              {completionIds.get(uid) && (
                <UndoForm
                  action={undoCompletion}
                  id={completionIds.get(uid)!}
                  label="Undo this player"
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink/80">Nobody new was recorded.</p>
      )}
      {outcome.alreadyCompleted.length > 0 && (
        <p className="text-sm text-meeple">
          Already completed earlier, not recorded again:{" "}
          {outcome.alreadyCompleted.map(nameOf).join(", ")}.
        </p>
      )}
      {outcome.notRecorded.length > 0 && (
        <p className="text-sm text-meeple">
          Not recorded, or undone since:{" "}
          {outcome.notRecorded.map(nameOf).join(", ")}.
        </p>
      )}
      {mayUndo && (
        <UndoForm action={undoConfirmation} id={id} label="Undo all" />
      )}
      <Link href={path} className={LINK}>
        Next group for this quest →
      </Link>
      <Link href={TOOL} className={LINK}>
        Back to the tool
      </Link>
    </Section>
  );
}
