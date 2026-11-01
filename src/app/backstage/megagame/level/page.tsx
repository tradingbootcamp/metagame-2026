import Link from "next/link";
import { connection } from "next/server";
import SignIn from "../../SignIn";
import { undoLevelUp } from "../actions";
import { levelsText, when } from "../format";
import { Avatar } from "../PlayerAdder";
import Section from "../Section";
import UndoForm from "../UndoForm";
import LevelUpForm from "./LevelUpForm";
import PickPlayer from "./PickPlayer";
import { toolAccess } from "@/lib/admin-auth";
import {
  CLASS_LABELS,
  MEGAGAME_CLASSES,
  isMegagameClass,
  type MegagameClass,
} from "@/lib/megagame-levels";
import {
  completionsInClass,
  levelEventsFor,
  playersByIds,
} from "@/lib/megagame-store";

const PATH = "/backstage/megagame/level";
const LINK =
  "text-sm text-ink/60 underline underline-offset-2 hover:text-meeple";

export default async function LevelUpPage(
  props: PageProps<"/backstage/megagame/level">,
) {
  await connection();
  const uid = [(await props.searchParams).u].flat()[0];
  const access = await toolAccess("megagame.verify");
  if (!access) {
    return (
      <SignIn next={uid ? `${PATH}?u=${encodeURIComponent(uid)}` : PATH} />
    );
  }

  const [player] = uid ? await playersByIds([uid]) : [];
  if (!player) {
    return (
      <Section title="Level up">
        {uid && (
          <p role="alert" className="text-sm text-meeple">
            That player was not found.
          </p>
        )}
        <PickPlayer />
      </Section>
    );
  }

  const [counts, events, canManage] = await Promise.all([
    Promise.all(
      MEGAGAME_CLASSES.map(
        async (c) => [c, await completionsInClass(player.id, c)] as const,
      ),
    ).then(
      (pairs) => Object.fromEntries(pairs) as Record<MegagameClass, number>,
    ),
    levelEventsFor(player.id),
    toolAccess("megagame.manage").then(Boolean),
  ]);

  return (
    <>
      <Section
        title="Level up"
        aside={
          <Link href={PATH} className={LINK}>
            Different player
          </Link>
        }
      >
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
          <Avatar player={player} />
          <div className="min-w-0">
            <p className="truncate font-medium text-navy">
              {player.name}
              {player.pronouns && (
                <span className="ml-2 text-sm font-normal text-ink/60">
                  {player.pronouns}
                </span>
              )}
            </p>
            <p className="text-sm text-ink/70">{levelsText(player.levels)}</p>
          </div>
        </div>
        <LevelUpForm
          id={crypto.randomUUID()}
          userId={player.id}
          name={player.name}
          levels={player.levels}
          completions={counts}
        />
      </Section>

      <Section title="Level history">
        {events.length === 0 ? (
          <p className="text-sm text-ink/60">No level events yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-white">
            {events.map((e) => {
              const label = isMegagameClass(e.class)
                ? CLASS_LABELS[e.class]
                : e.class;
              const live = e.voidedAt === null;
              const undoable =
                live &&
                e.source === "volunteer" &&
                (e.awardedBy === access.userId || canManage);
              return (
                <li key={e.id} className="flex flex-col gap-1 p-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`font-medium text-navy ${live ? "" : "line-through opacity-60"}`}
                    >
                      Level {e.level} {label}
                    </span>
                    <span className="shrink-0 text-ink/60">
                      {when(e.awardedAt)}
                    </span>
                  </div>
                  <p className="text-ink/70">
                    {e.source === "picker" ? "Faction picker" : "Volunteer"}
                    {!e.checksPassed &&
                      ` · recorded anyway${e.overrideReason ? `: ${e.overrideReason}` : ""}`}
                    {!live &&
                      ` · undone${e.voidReason ? `: ${e.voidReason}` : ""}`}
                  </p>
                  {e.note && <p className="text-ink/70">Note: {e.note}</p>}
                  {e.cardPhotoUrl && (
                    <a
                      href={e.cardPhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={LINK}
                    >
                      Record card photo
                    </a>
                  )}
                  {undoable && <UndoForm action={undoLevelUp} id={e.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
