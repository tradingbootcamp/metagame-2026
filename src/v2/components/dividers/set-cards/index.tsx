"use client";

import { useId, useRef, useState } from "react";
import DividerRow from "../DividerRow";
import { CARD as CARD_SIZE, SHADOW } from "../sizing";

// SET cards rendered in the weirdchess/dice language: a solid charcoal card with
// the symbols punched out as negative space. Colour is the one SET attribute we
// drop in b/w — shape (diamond/oval/squiggle), count (1–3) and shading
// (solid = cut, open = cut outline, striped = cut stripes) carry it.
//
// The cards are a game. Four is too few to be one, so the first tap spreads
// a full row of cards over the hairlines (they fade in around the centre four,
// which never move). Tap three cards (they glow); a set fades out and is
// redealt in place, anything else shakes. Every deal holds at least one set.
const CHARCOAL = "#4d4d4d";
const GLOW = "drop-shadow-[0_0_5px_rgba(216,80,43,0.85)]";
const EXIT_MS = 300;
const SHAKE_MS = 400;
const STAGGER_MS = 60;
// DividerRow's gap-[22px]: the spread cards keep the centre four's spacing.
const GAP = 22;

// portrait card, rounded corners, centred in the viewBox
const CARD =
  "M35 10 L65 10 A9 9 0 0 1 74 19 L74 81 A9 9 0 0 1 65 90 L35 90 A9 9 0 0 1 26 81 L26 19 A9 9 0 0 1 35 10 Z";

const HW = 16; // symbol half-width
const HH = 7; // symbol half-height

const SHAPE_NAMES = ["diamond", "oval", "squiggle"] as const;
const COUNT_NAMES = [1, 2, 3] as const;
const SHADING_NAMES = ["solid", "striped", "open"] as const;
type Shape = (typeof SHAPE_NAMES)[number];
type Count = (typeof COUNT_NAMES)[number];
type Shading = (typeof SHADING_NAMES)[number];

// A smooth squiggle: a sine centreline offset to a constant thickness with
// semicircle end-caps, so there are no sharp corners at any scale. Sampled as a
// fine polyline (the wave joins are shallow; only the caps need to be true arcs).
function squigglePath(cy: number): string {
  const x0 = 37,
    x1 = 63,
    amp = 5.2,
    ht = 4.6,
    N = 26;
  const f = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  const up: [number, number][] = [];
  const lo: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const cx = x0 + (x1 - x0) * s;
    const cyy = cy - amp * Math.sin(2 * Math.PI * s);
    const dy = -amp * 2 * Math.PI * Math.cos(2 * Math.PI * s);
    const len = Math.hypot(x1 - x0, dy);
    const nx = -dy / len,
      ny = (x1 - x0) / len;
    up.push([cx + nx * ht, cyy + ny * ht]);
    lo.push([cx - nx * ht, cyy - ny * ht]);
  }
  return (
    `M${f(up[0])} ` +
    up
      .slice(1)
      .map((p) => `L${f(p)}`)
      .join(" ") +
    ` A${ht} ${ht} 0 0 0 ${f(lo[N])} ` +
    lo
      .slice(0, N)
      .reverse()
      .map((p) => `L${f(p)}`)
      .join(" ") +
    ` A${ht} ${ht} 0 0 0 ${f(up[0])} Z`
  );
}

const SHAPES: Record<Shape, (cy: number) => string> = {
  diamond: (cy) =>
    `M${50 - HW} ${cy} L50 ${cy - HH} L${50 + HW} ${cy} L50 ${cy + HH} Z`,
  oval: (cy) =>
    `M41 ${cy - HH} L59 ${cy - HH} A${HH} ${HH} 0 0 1 59 ${cy + HH} L41 ${cy + HH} A${HH} ${HH} 0 0 1 41 ${cy - HH} Z`,
  squiggle: squigglePath,
};

// vertical centres of the symbols, evenly stacked, for each count
const COUNTS: Record<Count, number[]> = {
  1: [50],
  2: [38, 62],
  3: [29, 50, 71],
};

type Card = { shape: Shape; count: Count; shading: Shading };

const key = (c: Card) => `${c.shape}-${c.count}-${c.shading}`;

// With three attributes there are 27 cards, and any two fix the third that
// completes their set: per attribute, the shared value or the one left over.
const third = (a: Card, b: Card): Card => ({
  shape:
    a.shape === b.shape
      ? a.shape
      : SHAPE_NAMES.find((s) => s !== a.shape && s !== b.shape)!,
  count:
    a.count === b.count
      ? a.count
      : COUNT_NAMES.find((n) => n !== a.count && n !== b.count)!,
  shading:
    a.shading === b.shading
      ? a.shading
      : SHADING_NAMES.find((s) => s !== a.shading && s !== b.shading)!,
});

const isSet = (a: Card, b: Card, c: Card) => key(third(a, b)) === key(c);

const pick = <T,>(xs: readonly T[]) =>
  xs[Math.floor(Math.random() * xs.length)];
// A card in a slot. `seq` keys it (a redeal can put the same card back in the
// same slot, and it should still fade in as new); `delay` is its fade-in, or
// null for the four the page loads with.
type Slot = { card: Card; seq: number; delay: number | null };
let seq = 0;

const DECK: Card[] = SHAPE_NAMES.flatMap((shape) =>
  COUNT_NAMES.flatMap((count) =>
    SHADING_NAMES.map((shading) => ({ shape, count, shading })),
  ),
);

// Fills the empty slots so the row holds at least one set: one triple with at
// least one blank in it is picked to be the guaranteed set, so the fresh cards
// aren't always the answer. Cards are drawn from the rest of the deck, so the
// row never repeats one (MAX_CARDS keeps that possible).
function deal(slots: (Slot | null)[], delay: (i: number) => number): Slot[] {
  const blanks = slots.flatMap((s, i) => (s ? [] : [i]));
  for (;;) {
    const cards: (Card | null)[] = slots.map((s) => s?.card ?? null);
    const used = new Set(cards.map((c) => c && key(c)));
    const deck = DECK.filter((c) => !used.has(key(c)));
    const draw = () =>
      deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
    const last = pick(blanks);
    const others = new Set<number>();
    while (others.size < 2) {
      const i = Math.floor(Math.random() * slots.length);
      if (i !== last) others.add(i);
    }
    for (const i of others) cards[i] ??= draw();
    const [x, y] = [...others].map((i) => cards[i]!);
    const z = third(x, y);
    const at = deck.findIndex((c) => key(c) === key(z));
    if (at < 0) continue; // already on the row: pick again
    deck.splice(at, 1);
    cards[last] = z;
    for (const i of blanks) cards[i] ??= draw();
    return cards.map(
      (card, i) => slots[i] ?? { card: card!, seq: seq++, delay: delay(i) },
    );
  }
}

// The deal the page loads with (the first three are a set).
const FIRST: Slot[] = (
  [
    { shape: "diamond", count: 1, shading: "solid" },
    { shape: "oval", count: 2, shading: "striped" },
    { shape: "squiggle", count: 3, shading: "open" },
    { shape: "diamond", count: 2, shading: "solid" },
  ] as Card[]
).map((card) => ({ card, seq: seq++, delay: null }));

function CardGlyph({
  card,
  selected,
  leaving,
  shaking,
  delay,
  style,
  onClick,
  ref,
}: {
  card: Card;
  selected: boolean;
  leaving: boolean;
  shaking: boolean;
  delay: number | null;
  style?: React.CSSProperties;
  onClick: () => void;
  ref?: React.Ref<SVGSVGElement>;
}) {
  const { shape, count, shading } = card;
  const maskId = `set-${useId()}`;
  const clips: React.ReactNode[] = [];
  const cut: React.ReactNode[] = [];

  COUNTS[count].forEach((cy, i) => {
    const d = SHAPES[shape](cy);
    if (shading === "solid") {
      cut.push(<path key={i} d={d} fill="#000" />);
    } else if (shading === "open") {
      // round joins on the squiggle only; the diamond keeps its sharp points
      cut.push(
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#000"
          strokeWidth={3.2}
          strokeLinejoin={shape === "squiggle" ? "round" : "miter"}
          strokeLinecap={shape === "squiggle" ? "round" : "butt"}
        />,
      );
    } else {
      // striped: clip a run of thin bars to the symbol so only it shows stripes
      const clipId = `${maskId}-c${i}`;
      const bars: React.ReactNode[] = [];
      for (let y = cy - HH; y <= cy + HH; y += 3.4) {
        bars.push(
          <rect key={y} x={26} y={y} width={48} height={1.8} fill="#000" />,
        );
      }
      clips.push(
        <clipPath key={i} id={clipId}>
          <path d={d} />
        </clipPath>,
      );
      cut.push(
        <g key={i} clipPath={`url(#${clipId})`}>
          {bars}
        </g>,
      );
    }
  });

  // Tapping is the whole interaction, so it has to survive iOS: no
  // double-tap-to-zoom, and the cursor Safari wants before it delivers a click
  // to a plain <svg>. The invisible rect widens the target into the gutters —
  // a 22px-wide card is a small thing to hit with a thumb.
  return (
    <svg
      ref={ref}
      viewBox="22 6 56 88"
      aria-hidden
      onClick={onClick}
      className={`${CARD_SIZE} shrink-0 touch-manipulation overflow-visible pointer-coarse:cursor-pointer ${
        selected ? GLOW : SHADOW
      } ${shaking ? `animate-[shake_${SHAKE_MS}ms_ease-in-out]` : ""}`}
      style={{
        opacity: leaving ? 0 : 1,
        transition: `filter 300ms ease-out, opacity ${EXIT_MS}ms ease-out`,
        animation:
          delay === null
            ? undefined
            : `set-deal ${EXIT_MS}ms ease-out ${delay}ms both`,
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      <defs>{clips}</defs>
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="100"
        height="100"
      >
        <path d={CARD} fill="#fff" />
        {cut}
      </mask>
      <path d={CARD} fill={CHARCOAL} mask={`url(#${maskId})`} />
      <rect x={6} y={-4} width={88} height={108} fill="transparent" />
    </svg>
  );
}

// The deck is 27 cards; a few stay in hand so a redeal can't run dry.
const MAX_CARDS = 24;

// How many cards fit either side of the centre four: `pitch` apart, out to
// the edge of the row (the hairlines' full span).
const fit = (rowWidth: number, cardWidth: number, pitch: number) =>
  Math.min(
    (MAX_CARDS - 4) / 2,
    Math.max(0, Math.floor((rowWidth / 2 - cardWidth / 2) / pitch - 1.5)),
  );

export default function SetCardDivider() {
  const [board, setBoard] = useState(FIRST);
  const [picked, setPicked] = useState<number[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [shaking, setShaking] = useState(false);
  // Set once the row has spread: the card width the spread cards are placed by.
  const [spread, setSpread] = useState<{ cardWidth: number } | null>(null);
  const centre = useRef<HTMLDivElement>(null);
  const first = useRef<SVGSVGElement>(null);

  // The spread cards sit over the hairlines, so they're placed by hand rather
  // than laid out: offsets from the row's centre in card pitches. The centre
  // four stay in flow, so they never move.
  const spreadOut = () => {
    const cardWidth = first.current!.getBoundingClientRect().width;
    const pitch = cardWidth + GAP;
    const row = centre.current!.closest("[data-puzzle-game]")!.parentElement!;
    const side = fit(row.clientWidth, cardWidth, pitch);
    const slots: (Slot | null)[] = [
      ...Array<null>(side).fill(null),
      ...board,
      ...Array<null>(side).fill(null),
    ];
    // Fades in from the centre outward.
    const away = (i: number) => Math.abs(i - (slots.length - 1) / 2) - 1.5;
    setSpread({ cardWidth });
    return deal(slots, (i) => away(i) * STAGGER_MS);
  };

  const onClick = (i: number) => {
    if (leaving || shaking) return;
    if (!spread) {
      const wide = spreadOut();
      setBoard(wide);
      setPicked([i + (wide.length - board.length) / 2]);
      return;
    }
    if (picked.includes(i)) {
      setPicked(picked.filter((p) => p !== i));
      return;
    }
    const next = [...picked, i];
    setPicked(next);
    if (next.length < 3) return;
    const [a, b, c] = next.map((p) => board[p].card);
    if (!isSet(a, b, c)) {
      setShaking(true);
      setTimeout(() => {
        setShaking(false);
        setPicked([]);
      }, SHAKE_MS);
      return;
    }
    setLeaving(true);
    setTimeout(() => {
      setBoard(
        deal(
          board.map((slot, j) => (next.includes(j) ? null : slot)),
          () => 0,
        ),
      );
      setPicked([]);
      setLeaving(false);
    }, EXIT_MS);
  };

  const n = board.length;
  const inner = (n - 4) / 2;
  const glyph = (i: number, style?: React.CSSProperties) => (
    <CardGlyph
      key={board[i].seq}
      ref={i === inner ? first : undefined}
      card={board[i].card}
      delay={board[i].delay}
      selected={picked.includes(i)}
      leaving={leaving && picked.includes(i)}
      shaking={shaking && picked.includes(i)}
      style={style}
      onClick={() => onClick(i)}
    />
  );
  const place = (i: number): React.CSSProperties => {
    const pitch = spread!.cardWidth + GAP;
    const off = i - (n - 1) / 2;
    return {
      position: "absolute",
      top: 0,
      left: `calc(50% + ${(off * pitch - spread!.cardWidth / 2).toFixed(2)}px)`,
    };
  };

  return (
    <DividerRow game="set" bare={Boolean(spread)}>
      <div ref={centre} className="relative flex items-center gap-[22px]">
        {board.map((_, i) =>
          i >= inner && i < inner + 4 ? glyph(i) : glyph(i, place(i)),
        )}
      </div>
    </DividerRow>
  );
}
