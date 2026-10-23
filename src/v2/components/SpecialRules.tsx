"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import {
  Accessibility,
  ArrowLeftRight,
  Baby,
  BedDouble,
  Car,
  Clock,
  Dices,
  LifeBuoy,
  Mail,
  MapPin,
  MessagesSquare,
  Plus,
  RotateCcw,
  Scale,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import AnagramEmail from "./AnagramEmail";
import CrypticsLightbox from "./CrypticsLightbox";
import { DISPLAY } from "./styles";

// What each rule is about: its icon and the colour of its tile.
const TOPICS = {
  when: { Icon: Clock, tile: "bg-sky" },
  where: { Icon: MapPin, tile: "bg-sky" },
  lodging: { Icon: BedDouble, tile: "bg-sky" },
  meals: { Icon: UtensilsCrossed, tile: "bg-peach" },
  refunds: { Icon: RotateCcw, tile: "bg-tan" },
  transfers: { Icon: ArrowLeftRight, tile: "bg-tan" },
  kids: { Icon: Baby, tile: "bg-peach" },
  parking: { Icon: Car, tile: "bg-sky" },
  games: { Icon: Dices, tile: "bg-moss" },
  access: { Icon: Accessibility, tile: "bg-sky" },
  help: { Icon: LifeBuoy, tile: "bg-peach" },
  more: { Icon: MessagesSquare, tile: "bg-moss" },
} satisfies Record<string, { Icon: LucideIcon; tile: string }>;

export type RuleTopic = keyof typeof TOPICS;
export type Rule = {
  id?: string;
  topic: RuleTopic;
  question: string;
  answer: ReactNode;
};

const BODY_LINK = "font-semibold text-navy underline underline-offset-2";
const PANEL =
  "divide-y divide-navy/15 overflow-hidden rounded-[14px] border-2 border-navy bg-white shadow-[4px_4px_0_0_var(--color-navy)]";

// A d12's outline: a decagon around a pentagon face, joined at the corners.
const ring = (n: number, r: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((-90 + (360 / n) * k) * Math.PI) / 180;
    return [24 + r * Math.cos(a), 24 + r * Math.sin(a)] as const;
  });
const OUTER = ring(10, 22);
const FACE = ring(5, 12);
const pts = (p: readonly (readonly [number, number])[]) =>
  p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function D12({ face, spinning }: { face: string; spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={`size-10 shrink-0 ${spinning ? "motion-safe:animate-[spin_0.4s_linear_infinite]" : "transition-transform duration-300 group-hover:rotate-[36deg]"}`}
    >
      <polygon
        points={pts(OUTER)}
        className="fill-background stroke-navy"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {FACE.map(([x, y], k) => (
        <line
          key={k}
          x1={x}
          y1={y}
          x2={OUTER[2 * k][0]}
          y2={OUTER[2 * k][1]}
          className="stroke-navy"
          strokeWidth={1.5}
        />
      ))}
      <polygon
        points={pts(FACE)}
        className="fill-tan stroke-navy"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <text
        x="24"
        y="25"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-navy font-[family-name:var(--font-bebas)]"
        fontSize="13"
      >
        {face}
      </text>
    </svg>
  );
}

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

// §7 of the rulebook, the FAQ: the questions in two ruled columns, each
// opening to its answer. Two ways to play it: roll the d12 to open a random
// rule (there are twelve), or ask the rules lawyer, which opens every rule
// that mentions what you typed and dims the rest. Under the list, the
// cryptic-clue bonus round and the team's email.
export default function SpecialRules({ rules }: { rules: Rule[] }) {
  const uid = useId();
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const texts = useRef<string[] | null>(null);
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const [query, setQuery] = useState("");
  // Which rules mention every word typed; null while the box is empty.
  const [matches, setMatches] = useState<boolean[] | null>(null);
  const [face, setFace] = useState("?");
  const [rolling, setRolling] = useState(false);
  const [lit, setLit] = useState<number | null>(null);

  const toggle = (i: number) =>
    setOpen((o) => {
      const next = new Set(o);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  const search = (q: string) => {
    setQuery(q);
    setLit(null);
    const terms = words(q);
    if (!terms.length) {
      setMatches(null);
      setOpen(new Set());
      return;
    }
    // The answers are rich text, so search what's on the page.
    texts.current ??= items.current.map(
      (el) => el?.textContent?.toLowerCase() ?? "",
    );
    const t = texts.current;
    const hits = rules.map((_, i) => terms.every((w) => t[i].includes(w)));
    setMatches(hits);
    setOpen(new Set(hits.flatMap((hit, i) => (hit ? [i] : []))));
  };
  const hits = matches ? matches.filter(Boolean).length : rules.length;

  const roll = () => {
    if (rolling) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = Math.floor(Math.random() * rules.length);
    const land = () => {
      setFace(String(n + 1));
      setRolling(false);
      setQuery("");
      setMatches(null);
      setOpen(new Set([n]));
      setLit(n);
      items.current[n]?.scrollIntoView({
        behavior: still ? "auto" : "smooth",
        block: "center",
      });
      window.setTimeout(() => setLit((l) => (l === n ? null : l)), 2600);
    };
    if (still) return land();
    setRolling(true);
    const tick = window.setInterval(
      () => setFace(String(1 + Math.floor(Math.random() * rules.length))),
      70,
    );
    window.setTimeout(() => {
      window.clearInterval(tick);
      land();
    }, 700);
  };

  // Two columns of rules, each its own stack so opening one never moves the
  // other column.
  const half = Math.ceil(rules.length / 2);
  const columns = [rules.slice(0, half), rules.slice(half)];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-navy p-2.5 sm:p-3">
        <button
          type="button"
          onClick={roll}
          className="group flex items-center gap-2.5 rounded-xl bg-tan py-1 pr-4 pl-1.5 text-navy transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <D12 face={face} spinning={rolling} />
          <span className={`${DISPLAY} text-[22px] leading-none`}>
            Roll for a rule
          </span>
        </button>
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-tan">
          <Scale aria-hidden className="size-5 shrink-0 text-tan" />
          <input
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Ask the rules lawyer: parking, kids, refunds…"
            aria-label="Search the special rules"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-cream outline-none placeholder:text-cream/50"
          />
        </label>
        <span
          aria-live="polite"
          className="px-1 font-space-mono text-xs tracking-[0.1em] text-sky uppercase"
        >
          {lit !== null
            ? `Rolled ${lit + 1 === 8 || lit + 1 === 11 ? "an" : "a"} ${lit + 1}`
            : matches
              ? `${hits} of ${rules.length} rules`
              : `${rules.length} rules`}
        </span>
      </div>

      {matches && hits === 0 && (
        <p className="mb-5 rounded-xl border-2 border-dashed border-navy/30 p-4 text-ink/70">
          The rules lawyer finds nothing on that. Ask the team (below) and
          we&apos;ll add a rule.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {columns.map((column, c) => (
          <ul key={c} className={PANEL}>
            {column.map(({ id, topic, question, answer }, k) => {
              const i = c * half + k;
              const { Icon, tile } = TOPICS[topic];
              const isOpen = open.has(i);
              return (
                <li
                  key={question}
                  id={id}
                  ref={(el) => {
                    items.current[i] = el;
                  }}
                  className={`scroll-mt-28 transition-[background-color,opacity] duration-500 ${
                    matches && !matches[i] ? "opacity-35" : ""
                  } ${lit === i ? "bg-peach" : isOpen ? "bg-sky/25" : ""}`}
                >
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`${uid}-a${i}`}
                      onClick={() => toggle(i)}
                      className="group flex w-full items-center gap-3 px-3.5 py-3 text-left outline-none hover:bg-sky/40 focus-visible:bg-sky/40 focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-inset"
                    >
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-lg ${tile}`}
                      >
                        <Icon aria-hidden className="size-[18px] text-navy" />
                      </span>
                      <span className="min-w-0 flex-1 text-base leading-snug font-semibold text-navy">
                        {question}
                      </span>
                      <Plus
                        aria-hidden
                        className={`size-5 shrink-0 transition-transform duration-300 ${
                          isOpen
                            ? "rotate-45 text-navy"
                            : "text-navy/45 group-hover:text-navy"
                        }`}
                      />
                    </button>
                  </h3>
                  <div
                    id={`${uid}-a${i}`}
                    inert={!isOpen}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pr-4 pb-3.5 pl-[58px] text-[15px] leading-relaxed text-ink/75">
                        {answer}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-[14px] bg-navy p-3 text-cream">
          <CrypticsLightbox className="block w-24 shrink-0" />
          <div className="min-w-0">
            <p className="font-space-mono text-[10.5px] font-bold tracking-[0.14em] text-tan uppercase">
              <span aria-hidden>★ </span>Bonus round
            </p>
            <h3 className={`${DISPLAY} mt-1 text-[26px] leading-none`}>
              Write a clue for META
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-snug text-cream/75">
              Every clue on the 2025 cryptic crossword board resolves to META.
              Click the board to add yours.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[14px] border-2 border-dashed border-navy/30 p-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-peach">
            <Mail aria-hidden className="size-6 text-navy" />
          </span>
          <div className="min-w-0">
            <p className="font-space-mono text-[10.5px] font-bold tracking-[0.14em] text-meeple uppercase">
              Still stuck?
            </p>
            <h3
              className={`${DISPLAY} mt-1 text-[26px] leading-none text-navy`}
            >
              Ask the team
            </h3>
            <p className="mt-1.5 text-[15px] leading-snug text-ink/75">
              <AnagramEmail className={BODY_LINK} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
