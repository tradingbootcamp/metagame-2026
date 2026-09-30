"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HEADING } from "@/v2/components/styles";
import {
  placeHats,
  STACKING,
  WornHat,
  type StackTable,
} from "@/v2/hat-trick/HatPile";
import {
  HATS,
  hatAspect,
  hatCutoutStyle,
  type HatId,
} from "@/v2/hat-trick/hats";

const IDS = Object.keys(HATS) as HatId[];
const PAIRS = IDS.flatMap((b) =>
  IDS.filter((t) => t !== b).map((t) => [b, t] as const),
);
// The save rewrites stacking.json, which can hot-reload this page; keep the
// place in the list across that.
const KEY = "hat-stack-editor-pair";

export default function StackEditor() {
  const [table, setTable] = useState<StackTable>(STACKING);
  const [index, setIndex] = useState(0);
  const [mouse, setMouse] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring after mount
      if (saved > 0 && saved < PAIRS.length) setIndex(saved);
    } catch {
      // start at the first pair
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(index));
    } catch {
      // not remembered, that's fine
    }
  }, [index]);

  const [bottomId, topId] = PAIRS[index];
  const bottom = HATS[bottomId];
  const top = HATS[topId];
  const saved = table[bottomId]?.[topId];
  const [base, auto] = placeHats([bottom, top], table);
  const done = PAIRS.filter(([b, t]) => table[b]?.[t]).length;

  const go = (i: number) => setIndex((i + PAIRS.length) % PAIRS.length);
  const nextOpen = (t: StackTable) => {
    for (let k = 1; k <= PAIRS.length; k++) {
      const i = (index + k) % PAIRS.length;
      const [b, tp] = PAIRS[i];
      if (!t[b]?.[tp]) return i;
    }
    return (index + 1) % PAIRS.length;
  };

  const save = async (offset: [number, number] | null) => {
    setError(null);
    try {
      const res = await fetch("/api/dev/hats/stack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bottom: bottomId, top: topId, offset }),
      });
      const body = (await res.json()) as { table?: StackTable; error?: string };
      if (!res.ok || !body.table)
        throw new Error(body.error ?? `HTTP ${res.status}`);
      setTable(body.table);
      if (offset) go(nextOpen(body.table));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toUnits = (e: {
    clientX: number;
    clientY: number;
  }): [number, number] | null => {
    const el = box.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const unit = r.width / 100;
    return [(e.clientX - r.left) / unit, (e.clientY - r.top) / unit];
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "Backspace" || e.key === "Delete") void save(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const topAt: [number, number] = mouse
    ? mouse
    : saved
      ? [base.cx + saved[0], base.cy + saved[1]]
      : [auto.cx, auto.cy];

  return (
    <main className="min-h-screen bg-cream p-4 text-ink lg:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className={`${HEADING} text-2xl text-navy`}>Hat Stack Editor</h1>
          <p className="mt-1 text-sm text-ink/70">
            Move the top hat with the mouse and click to place it on the bottom
            one. Saves to stacking.json and moves on to the next open pair.
            &larr;/&rarr; step through pairs; Backspace clears this one.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/dev/hats" className="underline underline-offset-2">
            Hat Editor
          </Link>
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
        </nav>
      </header>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="flex flex-col items-center">
          <p className="text-sm">
            <span className="font-bold">{top.name}</span> on{" "}
            <span className="font-bold">{bottom.name}</span>
            <span className="text-ink/60">
              {" "}
              · pair {index + 1} of {PAIRS.length}
              {saved ? " · placed" : " · not placed yet"}
            </span>
          </p>
          {/* Room above the card for the top hat; the whole area tracks the mouse. */}
          <div
            className="relative cursor-crosshair touch-none pt-[340px]"
            onPointerMove={(e) => setMouse(toUnits(e))}
            onPointerLeave={() => setMouse(null)}
            onClick={(e) => {
              const m = toUnits(e);
              if (m) void save([m[0] - base.cx, m[1] - base.cy]);
            }}
          >
            <div className="relative aspect-square w-[420px] rounded-2xl border border-dashed border-navy/40 bg-white">
              <svg
                viewBox="0 0 100 100"
                className="absolute bottom-0 left-[7%] h-[86%] w-[86%] fill-navy/15"
              >
                <path d="M50 8c-16 0-23 11-23 24 0 11-1 22-5 30 3 4 12 4 18-1v4c-8 1-20 4-26 11-5 5-7 14-7 24h86c0-10-2-19-7-24-6-7-18-10-26-11v-4c6 5 15 5 18 1-4-8-5-19-5-30 0-13-7-24-23-24z" />
              </svg>
              <div
                ref={box}
                className="pointer-events-none absolute inset-x-[7%] top-[14%] bottom-0"
              >
                <WornHat {...base} />
                {saved && mouse && (
                  <WornHat
                    hat={top}
                    width={top.wear.width}
                    cx={base.cx + saved[0]}
                    cy={base.cy + saved[1]}
                    style={{ opacity: 0.3 }}
                  />
                )}
                <WornHat
                  hat={top}
                  width={top.wear.width}
                  cx={topAt[0]}
                  cy={topAt[1]}
                />
              </div>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-sm text-meeple">
              Couldn&rsquo;t save: {error}
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-3">
          <p className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
            {done} of {PAIRS.length} placed · rows bottom, columns top
          </p>
          <table className="border-separate border-spacing-0.5">
            <thead>
              <tr>
                <th />
                {IDS.map((t) => (
                  <th key={t} title={HATS[t].name} className="p-0.5">
                    <Thumb id={t} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {IDS.map((b) => (
                <tr key={b}>
                  <th title={HATS[b].name} className="p-0.5">
                    <Thumb id={b} />
                  </th>
                  {IDS.map((t) => {
                    if (b === t) return <td key={t} />;
                    const i = PAIRS.findIndex(
                      ([pb, pt]) => pb === b && pt === t,
                    );
                    return (
                      <td key={t}>
                        <button
                          type="button"
                          title={`${HATS[t].name} on ${HATS[b].name}`}
                          onClick={() => go(i)}
                          className={`block size-7 rounded border ${
                            i === index
                              ? "border-meeple ring-2 ring-meeple"
                              : "border-navy/20"
                          } ${table[b]?.[t] ? "bg-emerald-500/70" : "bg-white"}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <Tower table={table} />
        </aside>
      </div>
    </main>
  );
}

// Every hat piled up, in hats.ts order or shuffled, with room above for
// however tall it gets.
function Tower({ table }: { table: StackTable }) {
  const WIDTH = 220;
  const [order, setOrder] = useState(IDS);
  const shuffle = () => {
    const next = [...IDS];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
  };
  const placed = placeHats(
    order.map((h) => HATS[h]),
    table,
  );
  const highest = Math.min(
    ...placed.map((p) => p.cy - p.width / hatAspect(p.hat) / 2),
  );
  const unitPx = (WIDTH * 0.86) / 100;
  const shuffled = order.some((h, i) => h !== IDS[i]);
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
          All hats, {shuffled ? "shuffled" : "in hats.ts order"}
        </p>
        <button
          type="button"
          onClick={shuffle}
          className="rounded border border-navy/30 bg-white px-2 py-1 text-xs hover:border-navy"
        >
          Randomize order
        </button>
        {shuffled && (
          <button
            type="button"
            onClick={() => setOrder(IDS)}
            className="rounded border border-navy/30 bg-white px-2 py-1 text-xs hover:border-navy"
          >
            Reset
          </button>
        )}
      </div>
      <div
        className="relative aspect-square rounded-2xl border border-dashed border-navy/40 bg-white"
        style={{
          width: WIDTH,
          marginTop: Math.max(0, -(highest + 14) * unitPx) + 40,
        }}
      >
        <div className="absolute inset-x-[7%] top-[14%] bottom-0">
          {placed.map((p) => (
            <WornHat key={p.hat.id} {...p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Thumb({ id }: { id: HatId }) {
  return (
    <div className="flex size-7 items-center justify-center">
      <div className="w-7" style={hatCutoutStyle(HATS[id])} />
    </div>
  );
}
