"use client";

import { SmilePlusIcon, XIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Reaction } from "@/lib/unconference";

// The full picker is a few hundred KB of emoji data, so it loads only when
// someone opens it.
const Picker = dynamic(() => import("./EmojiPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-[300px] items-center justify-center rounded-lg border border-[#1b1530]/15 bg-cream text-xs text-[#1b1530]/55">
      Loading emoji…
    </div>
  ),
});

const QUICK = ["👍", "❤️", "🎉", "😂", "🙋", "🔥"];

export type Reactors = { emoji: string; names: string[] }[];

const who = (r: Reaction) => {
  const more = r.count - r.names.length;
  return `${r.names.join(", ")}${more > 0 ? ` and ${more} more` : ""} reacted with ${r.emoji}`;
};

// Discord's look: a pill per emoji with its count, tinted when it's yours.
// `solid` is for pills sitting on the cork, which a translucent grey would
// disappear into.
const pill = (mine: boolean, interactive: boolean, solid = false) =>
  `flex items-center rounded-full border-[1.5px] tabular-nums transition-colors ${
    mine
      ? "border-[#3f6fd1] bg-[#d5e3fb] text-[#23439a]"
      : `${solid ? "border-[#1b1530]/20 bg-cream" : "border-transparent bg-[#1b1530]/[0.08]"} text-[#1b1530]/75`
  } ${interactive ? (mine ? "hover:bg-[#c3d6f8]" : "hover:border-[#1b1530]/40") : "cursor-default"}`;

/** Who reacted with what, one emoji at a time, like Discord's reactions view. */
function ReactorsPanel({
  load,
  onClose,
}: {
  load: () => Promise<Reactors>;
  onClose: () => void;
}) {
  const [list, setList] = useState<Reactors | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState(0);
  useEffect(() => {
    let live = true;
    load()
      .then((r) => live && setList(r))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [load]);

  const shown = list?.[Math.min(tab, (list?.length ?? 1) - 1)];
  return (
    <div className="mt-1 overflow-hidden rounded-xl border-[1.5px] border-[#1b1530]/20 bg-cream shadow-[3px_4px_0_rgba(27,21,48,0.18)]">
      <div className="flex items-center justify-between border-b border-[#1b1530]/10 px-3 py-1.5">
        <span className="text-xs font-bold tracking-[0.1em] text-[#1b1530]/60 uppercase">
          Reactions
        </span>
        <button
          type="button"
          aria-label="Close reactions"
          onClick={onClose}
          className="rounded p-0.5 text-[#1b1530]/50 hover:bg-[#1b1530]/10 hover:text-[#1b1530]"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      {failed ? (
        <p className="px-3 py-3 text-sm text-[#c02f4e]">
          Couldn’t load who reacted.
        </p>
      ) : !list ? (
        <p className="px-3 py-3 text-sm text-[#1b1530]/50">Loading…</p>
      ) : list.length === 0 ? (
        <p className="px-3 py-3 text-sm text-[#1b1530]/50">No reactions yet.</p>
      ) : (
        <div className="flex max-h-64 min-h-32">
          <div
            role="tablist"
            aria-orientation="vertical"
            className="flex shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[#1b1530]/10 p-1.5"
          >
            {list.map((r, i) => (
              <button
                key={r.emoji}
                type="button"
                role="tab"
                aria-selected={shown === r}
                onClick={() => setTab(i)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm ${
                  shown === r
                    ? "bg-[#1b1530]/10 font-bold"
                    : "hover:bg-[#1b1530]/5"
                }`}
              >
                <span className="text-base leading-none">{r.emoji}</span>
                <span className="text-xs tabular-nums">{r.names.length}</span>
              </button>
            ))}
          </div>
          <ul role="tabpanel" className="flex-1 overflow-y-auto p-1.5">
            {shown?.names.map((name, i) => (
              <li
                key={`${name}-${i}`}
                className="rounded-md px-2 py-1 text-sm text-[#1b1530]"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Discord-style pills under the poster, a picker for any emoji, and who's who. */
export function ReactionBar({
  reactions,
  canReact,
  onToggle,
  loadReactors,
  signInHint,
}: {
  reactions: Reaction[];
  canReact: boolean;
  onToggle: (emoji: string) => void;
  loadReactors: () => Promise<Reactors>;
  /** Shown instead of the add button when this viewer can't react. */
  signInHint?: React.ReactNode;
}) {
  const [picking, setPicking] = useState(false);
  const [viewing, setViewing] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!picking) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setPicking(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [picking]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {reactions.map((r) => (
          <button
            key={r.emoji}
            type="button"
            title={who(r)}
            disabled={!canReact}
            onClick={() => onToggle(r.emoji)}
            aria-pressed={r.mine}
            aria-label={`${r.emoji} ${r.count}${r.mine ? ", including you" : ""}`}
            className={`${pill(r.mine, canReact)} h-7 gap-1.5 px-2 text-sm`}
          >
            <span className="leading-none">{r.emoji}</span>
            <span className="text-xs font-bold">{r.count}</span>
          </button>
        ))}
        {canReact && (
          <div ref={box} className="relative">
            <button
              type="button"
              aria-label="Add a reaction"
              aria-expanded={picking}
              onClick={() => setPicking((p) => !p)}
              className="flex h-7 items-center gap-1 rounded-full border-[1.5px] border-dashed border-[#1b1530]/30 bg-white/50 px-2 text-[#1b1530]/65 transition-colors hover:border-[#1b1530]/55 hover:text-[#1b1530]"
            >
              <SmilePlusIcon className="size-4" />
            </button>
            {picking && (
              <div className="absolute bottom-full left-0 z-30 mb-2 flex flex-col gap-1.5 rounded-xl border-[1.5px] border-[#1b1530]/20 bg-cream p-1.5 shadow-xl">
                <div className="flex gap-1">
                  {QUICK.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        onToggle(e);
                        setPicking(false);
                      }}
                      className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-[#1b1530]/10"
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <Picker
                  onPick={(e) => {
                    onToggle(e);
                    setPicking(false);
                  }}
                />
              </div>
            )}
          </div>
        )}
        {reactions.length > 0 && (
          <button
            type="button"
            aria-expanded={viewing}
            onClick={() => setViewing((v) => !v)}
            className="ml-1 text-xs font-semibold text-[#1b1530]/55 underline underline-offset-2 hover:text-[#1b1530]"
          >
            {viewing ? "Hide reactions" : "View reactions"}
          </button>
        )}
        {!canReact &&
          (signInHint ? (
            <span className="text-xs text-[#1b1530]/50">{signInHint}</span>
          ) : (
            reactions.length === 0 && (
              <span className="text-xs text-[#1b1530]/45">
                No reactions yet.
              </span>
            )
          ))}
      </div>
      {viewing && (
        <ReactorsPanel load={loadReactors} onClose={() => setViewing(false)} />
      )}
    </div>
  );
}

/**
 * The board's small version, hanging under a sticky note. Each pill toggles
 * the viewer's own reaction, the same as under the poster; past `max` a
 * "+N" pill opens the notice instead.
 */
export function ReactionPills({
  reactions,
  max = 4,
  onToggle,
  onMore,
}: {
  reactions: Reaction[];
  max?: number;
  /** Absent when this viewer can't react; the pills just show counts. */
  onToggle?: (emoji: string) => void;
  onMore?: () => void;
}) {
  if (reactions.length === 0) return null;
  const shown = reactions.slice(0, max);
  const rest = reactions.length - shown.length;
  const size = "h-[18px] gap-0.5 px-1 text-[10px] leading-none font-bold";
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {shown.map((r) =>
        onToggle ? (
          <button
            key={r.emoji}
            type="button"
            title={who(r)}
            aria-pressed={r.mine}
            aria-label={`${r.emoji} ${r.count}${r.mine ? ", including you" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(r.emoji);
            }}
            className={`${pill(r.mine, true, true)} ${size} shadow-[1px_1.5px_0_rgba(27,21,48,0.2)]`}
          >
            <span className="text-[11px]">{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        ) : (
          <span
            key={r.emoji}
            title={who(r)}
            className={`${pill(r.mine, false, true)} ${size} shadow-[1px_1.5px_0_rgba(27,21,48,0.2)]`}
          >
            <span className="text-[11px]">{r.emoji}</span>
            <span>{r.count}</span>
          </span>
        ),
      )}
      {rest > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMore?.();
          }}
          className={`${pill(false, true, true)} ${size} shadow-[1px_1.5px_0_rgba(27,21,48,0.2)]`}
        >
          +{rest}
        </button>
      )}
    </div>
  );
}
