"use client";

import { useEffect, useRef, useState } from "react";
import { confetti } from "../confetti";
import DividerRow from "../DividerRow";
import { IconGlyph } from "../IconDivider";
import { GLYPH_PX, ICON_GAP, ICON_GAP_PX } from "../sizing";
import { trackEgg } from "../track";
import {
  buildRoad,
  buildSettlement,
  canRoad,
  canSettle,
  CHAIN,
  EDGES,
  points,
  RESOURCES,
  start,
  useCatan,
  VERTICES,
  WIN_VP,
  type CatanState,
} from "./game";
import { ICONS } from "./icons";

// brick · wood · wheat · wool — Catan resources from the Noun Project (CC BY
// 3.0, Callum Taylor). Credit on /credits. A tap starts the game (game.ts):
// the tiles grow until they nearly touch and the board is drawn over them.
const CHARCOAL = "#4d4d4d";
const PLAYER = "var(--color-meeple)";
const TRAIL = "#f2b134";
const PITCH = GLYPH_PX + ICON_GAP_PX;
// A tile's hexagon is 72/90 of its glyph's width.
const SCALE = (PITCH - 5) / (GLYPH_PX * 0.8);
// Corners sit on the lattice the tiles would make if they did touch, so the
// pieces land in the gaps between them.
const R = PITCH / Math.sqrt(3);
const HALF_H = 68; // the board's half height: points above, cards below
const HALF_W = 2 * PITCH + 7;
const TOKEN_Y = 21;
const GROW_MS = 600;

const corner = (v: number) => {
  const k = v % CHAIN;
  const y = k % 2 ? R : R / 2;
  return { x: ((k - 4) * PITCH) / 2, y: v < CHAIN ? -y : y };
};
const tileX = (h: number) => (h - 1.5) * PITCH;

// A road along its edge, drawn short of the corners at each end.
const road = (e: number, trim: number) => {
  const [a, b] = EDGES[e].map(corner);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len];
  return {
    x1: a.x + ux * trim,
    y1: a.y + uy * trim,
    x2: b.x - ux * trim,
    y2: b.y - uy * trim,
  };
};

const HOUSE = "M-5.5 5 V-1 L0 -6 L5.5 -1 V5 Z";
const STAR = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 2.4 : 5.5;
  const a = (i * Math.PI) / 5 - Math.PI / 2;
  return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
}).join(" L");

function Board({ s }: { s: CatanState }) {
  const vp = points(s);
  const live = s.phase === "setup" || s.phase === "play";
  const spots = live
    ? Array.from({ length: VERTICES }, (_, v) => v).filter((v) =>
        canSettle(s, v),
      )
    : [];
  const paths = live ? EDGES.map((_, e) => e).filter((e) => canRoad(s, e)) : [];

  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      className="absolute top-1/2 left-1/2 overflow-visible"
      style={{ animation: `catan-in 500ms ease-out ${GROW_MS - 200}ms both` }}
    >
      {s.numbers.map((n, h) => {
        const hit = s.payout?.tiles.includes(h);
        return (
          <g
            key={`${h}-${hit ? s.payout!.id : 0}`}
            transform={`translate(${tileX(h)} ${TOKEN_Y})`}
          >
            <g
              style={
                hit
                  ? {
                      animation: "catan-pay 700ms ease-out",
                      transformBox: "fill-box",
                      transformOrigin: "center",
                    }
                  : undefined
              }
            >
              <circle
                r={8.5}
                fill="var(--background)"
                stroke={CHARCOAL}
                strokeWidth={1.2}
              />
              <text
                y={0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fill={CHARCOAL}
                className="font-[family-name:var(--font-bebas)]"
              >
                {n}
              </text>
            </g>
          </g>
        );
      })}

      {s.roads.map((e) => (
        <g key={e} strokeLinecap="round">
          <line {...road(e, 7)} stroke="var(--background)" strokeWidth={7} />
          <line {...road(e, 7)} stroke={PLAYER} strokeWidth={4} />
        </g>
      ))}
      {s.longest && (
        // The longest road lights up end to end as it scores.
        <path
          d={`M${s.longest.map((v) => `${corner(v).x} ${corner(v).y}`).join(" L")}`}
          pathLength={100}
          fill="none"
          stroke={TRAIL}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="20 100"
          style={{ animation: "catan-trail 1400ms ease-in-out 2 both" }}
        />
      )}
      {s.settlements.map((v) => (
        <path
          key={v}
          d={HOUSE}
          transform={`translate(${corner(v).x} ${corner(v).y})`}
          fill={PLAYER}
          stroke="var(--background)"
          strokeWidth={1.5}
        />
      ))}

      {/* Where you can build right now: faint marks, with wider targets. */}
      {paths.map((e) => (
        <g key={e} className="cursor-pointer" onClick={() => buildRoad(e)}>
          <line
            {...road(e, 9)}
            stroke={PLAYER}
            strokeWidth={3}
            strokeDasharray="2 4"
            strokeLinecap="round"
            opacity={0.5}
          />
          <line
            {...road(e, 9)}
            stroke="transparent"
            strokeWidth={12}
            pointerEvents="all"
          />
        </g>
      ))}
      {spots.map((v) => (
        <g
          key={v}
          transform={`translate(${corner(v).x} ${corner(v).y})`}
          className="cursor-pointer"
          onClick={() => buildSettlement(v)}
        >
          <circle r={3.5} fill={PLAYER} className="animate-pulse" />
          <circle r={10} fill="transparent" pointerEvents="all" />
        </g>
      ))}

      {Array.from({ length: WIN_VP }, (_, i) => (
        <path
          key={i}
          d={`M${STAR} Z`}
          transform={`translate(${(i - (WIN_VP - 1) / 2) * 13} ${-HALF_H + 6})`}
          fill={i < vp ? PLAYER : "none"}
          stroke={i < vp ? PLAYER : CHARCOAL}
          strokeOpacity={i < vp ? 1 : 0.3}
          strokeWidth={1}
          strokeLinejoin="round"
          className="transition-[fill] duration-500"
        />
      ))}

      {/* Cards in hand, under the tile that pays them. */}
      {RESOURCES.map((r, h) =>
        s.hand[r] ? (
          <g key={r} transform={`translate(${tileX(h)} ${R + 13})`}>
            <svg
              x={-19}
              y={-10}
              width={20}
              height={20}
              viewBox={ICONS[h].viewBox}
            >
              {ICONS[h].paths!.slice(1).map((d, i) => (
                <path key={i} d={d} fill={CHARCOAL} />
              ))}
            </svg>
            <text
              x={1}
              y={0.5}
              dominantBaseline="central"
              fontSize={13}
              fill={CHARCOAL}
              className="font-[family-name:var(--font-bebas)]"
            >
              ×{s.hand[r]}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  );
}

export default function CatanDivider() {
  const s = useCatan();
  const on = s.phase !== "rest";
  const centre = useRef<HTMLDivElement>(null);
  // How far the board runs over each hairline, which gives way (and keeps
  // the gap it had to the star's slot).
  const [overhang, setOverhang] = useState<number>();

  const begin = () => {
    if (on) return;
    const box = centre.current!.getBoundingClientRect();
    const icons = centre.current!.closest("[data-puzzle-game]")!;
    const hairline = icons.parentElement!.firstElementChild!;
    const end = hairline.getBoundingClientRect().right;
    const reach = box.left - end;
    const keep = icons.getBoundingClientRect().left - end;
    setOverhang(Math.max(0, HALF_W - box.width / 2 - reach + keep));
    start();
  };

  const won = s.phase === "won";
  useEffect(() => {
    if (!won) return;
    trackEgg({ egg: "catan", event: "win" });
    const b = centre.current!.getBoundingClientRect();
    confetti(
      b.left + b.width / 2 - HALF_W,
      b.bottom,
      2 * HALF_W,
      b.height + 80,
    );
  }, [won]);

  return (
    <DividerRow game="catan" overhang={on ? overhang : undefined}>
      <div
        ref={centre}
        className={`relative flex items-center ${ICON_GAP}`}
        style={{
          paddingBlock: on ? HALF_H - GLYPH_PX / 2 : 0,
          transition: `padding ${GROW_MS}ms ease-out`,
        }}
      >
        {ICONS.map((icon) => (
          <span
            key={icon.name}
            onClick={begin}
            className="block shrink-0 touch-manipulation pointer-coarse:cursor-pointer"
            style={{
              transform: on ? `scale(${SCALE})` : undefined,
              transition: `transform ${GROW_MS}ms ease-out`,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <IconGlyph icon={icon} className="block" />
          </span>
        ))}
        {on && <Board s={s} />}
      </div>
    </DividerRow>
  );
}
