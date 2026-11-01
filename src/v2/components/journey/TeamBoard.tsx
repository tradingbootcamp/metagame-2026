"use client";

import { useEffect } from "react";
import { Check, Flag, Shuffle, X } from "lucide-react";
import type { Answer, Answers } from "@/v2/forms/engine";
import { cn } from "@/v2/lib/utils";

// The volunteer teams as a list, each with three marks to pick one of: a
// check (interested), an X (rather not) or a flag (could lead it). They're
// written to the three Airtable fields the form always had, whose option
// lists differ a little, so each team names its option in each.

export type Team = {
  name: string;
  /** Some of the work happens in the weeks before the con. */
  ahead?: boolean;
  want: string;
  avoid: string;
  lead: string;
};

const same = (name: string, value = name, ahead?: boolean): Team => ({
  name,
  ahead,
  want: value,
  avoid: value,
  lead: value,
});

export const TEAMS: Team[] = [
  same("Registration desk"),
  same("Info desk"),
  same("Room check", "Room check (for sessions)"),
  same("Physical labor"),
  same("Childcare"),
  {
    name: "AV and tech support",
    want: "AV support (e.g. setting up projectors)",
    avoid: "Tech support (e.g. setting up projectors)",
    lead: "Tech support (e.g. setting up projectors)",
  },
  same(
    "Web development",
    "Web development (e.g. programming mini games)",
    true,
  ),
  {
    name: "Marketing",
    ahead: true,
    want: "Marketing (requires advance work)",
    avoid: "Marketing",
    lead: "Marketing",
  },
  {
    name: "Megagame design",
    ahead: true,
    want: "Megagame design (requires advance work)",
    avoid: "Helping design the megagame (requires advance work)",
    lead: "Helping design the megagame (requires advance work)",
  },
  same(
    "Running the Megagame",
    "Helping run the megagame (during the conference)",
  ),
  same(
    "Set design and fabrication",
    "Set design / physical fabrication / hardware / construction",
    true,
  ),
  same("Generalist", "Generalist (putting out fires as needed)"),
  same("Community health and safety"),
  same("Speaker coordination"),
  same("MCing sessions"),
];

const ANYWHERE = "Indifferent: Slot me in anywhere, coach!";

/** The questions this board asks. */
export const TEAM_KEYS = ["teams", "notTeams", "leadTeams"];

const MARKS = [
  {
    mark: "want",
    key: "teams",
    label: "Interested",
    Icon: Check,
    on: "border-moss bg-moss text-white",
  },
  {
    mark: "avoid",
    key: "notTeams",
    label: "Avoid",
    Icon: X,
    on: "border-meeple bg-meeple text-white",
  },
  {
    mark: "lead",
    key: "leadTeams",
    label: "Could lead",
    Icon: Flag,
    on: "border-brand-blue bg-brand-blue text-white",
  },
] as const;
type Mark = (typeof MARKS)[number]["mark"];
const keyOf = (m: Mark) => MARKS.find((x) => x.mark === m)!.key;

const list = (v: Answer) => (Array.isArray(v) ? v : []);

export default function TeamBoard({
  answers,
  update,
}: {
  answers: Answers;
  update: (key: string, fn: (v: Answer) => Answer) => void;
}) {
  const has = (t: Team, m: Mark) => list(answers[keyOf(m)]).includes(t[m]);
  // One mark per team. A flag counts as interest too, so the team's "sounds
  // fun" list stays complete.
  const state = (t: Team): Mark | null =>
    has(t, "lead")
      ? "lead"
      : has(t, "want")
        ? "want"
        : has(t, "avoid")
          ? "avoid"
          : null;
  const put = (t: Team, m: Mark, on: boolean) =>
    update(keyOf(m), (v) =>
      on ? [...new Set([...list(v), t[m]])] : list(v).filter((x) => x !== t[m]),
    );
  const anywhere = list(answers.teams).includes(ANYWHERE);
  const setAnywhere = (on: boolean) =>
    update("teams", (v) =>
      on ? [...list(v), ANYWHERE] : list(v).filter((x) => x !== ANYWHERE),
    );
  const interests = TEAMS.filter((t) => state(t) && state(t) !== "avoid");

  const setMark = (t: Team, m: Mark) => {
    const next = state(t) === m ? null : m;
    put(t, "want", next === "want" || next === "lead");
    put(t, "lead", next === "lead");
    put(t, "avoid", next === "avoid");
    // The first team they're keen on means they're no longer indifferent.
    if (next && next !== "avoid" && anywhere && !interests.length)
      setAnywhere(false);
  };

  // Until they say otherwise, anywhere is fine.
  const untouched = answers.teams === undefined;
  useEffect(() => {
    if (untouched) setAnywhere(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the step opens
  }, [untouched]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y-2 border-navy py-3">
        <ul
          aria-label="What the marks mean"
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13.5px] font-semibold text-ink/70"
        >
          {MARKS.map(({ mark, label, Icon, on }) => (
            <li key={mark} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "grid size-6 place-items-center rounded-full border-2",
                  on,
                )}
              >
                <Icon className="size-3.5" strokeWidth={3} />
              </span>
              {label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-pressed={anywhere}
          onClick={() => setAnywhere(!anywhere)}
          className={cn(
            "flex items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-[14.5px] font-semibold transition-colors sm:ml-auto",
            anywhere
              ? "border-navy bg-navy text-cream"
              : "border-navy/20 text-navy hover:border-navy",
          )}
        >
          <Shuffle aria-hidden className="size-4" />
          Slot me in anywhere
        </button>
      </div>

      <ul className="grid sm:grid-cols-2 sm:gap-x-10">
        {TEAMS.map((t) => {
          const s = state(t);
          return (
            <li
              key={t.name}
              className={cn(
                "flex items-center justify-between gap-4 border-b border-navy/15 py-2.5 transition-opacity duration-300",
                s === "avoid" && "opacity-60",
              )}
            >
              <span className="min-w-0">
                <span className="block text-[16px] leading-snug font-semibold text-navy">
                  {t.name}
                </span>
                {t.ahead && (
                  <span className="font-space-mono text-[10px] tracking-[0.08em] text-ink/50 uppercase">
                    Before the con
                  </span>
                )}
              </span>
              <span
                role="group"
                aria-label={t.name}
                className="flex shrink-0 gap-1.5"
              >
                {MARKS.map(({ mark, label, Icon, on }) => {
                  const active = s === mark;
                  return (
                    <button
                      key={mark}
                      type="button"
                      aria-pressed={active}
                      aria-label={`${t.name}: ${label}`}
                      onClick={() => setMark(t, mark)}
                      className={cn(
                        "grid size-9 place-items-center rounded-full border-2 transition-[background-color,border-color,color,scale] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-2 active:scale-95",
                        active
                          ? on
                          : "border-navy/25 text-navy/50 hover:border-navy hover:text-navy",
                      )}
                    >
                      <Icon
                        aria-hidden
                        className="size-4"
                        strokeWidth={active ? 3 : 2.25}
                      />
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
