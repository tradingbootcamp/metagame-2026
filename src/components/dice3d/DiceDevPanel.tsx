"use client";

import { useEffect, useState } from "react";
import { TAKES } from "./rollInTakes";
import type { RollInTake } from "./introDriver";
import type { TakeMeta } from "./physicsRollIn";

// Dev-only curation panel (Dice.tsx mounts it only in development): pick any
// baked take from a dropdown, throw fresh live rolls without a page reload,
// and keep a good roll — it's POSTed to /api/dev/keep-take and folded into the
// baked set later. Mode changes rewrite the URL params Dice3D already reads
// (?sim / ?record) and remount it via onRemount, so the intro paths themselves
// stay untouched.

type Mode = "random" | "live" | number;

function currentMode(): Mode {
  const p = new URLSearchParams(window.location.search);
  const sim = Number(p.get("sim"));
  if (Number.isInteger(sim) && sim >= 1 && sim <= TAKES.length) return sim;
  if (p.has("record")) return "live";
  return "random";
}

function writeModeToUrl(mode: Mode) {
  const p = new URLSearchParams(window.location.search);
  p.delete("sim");
  p.delete("record");
  if (mode === "live") p.set("record", "1");
  if (typeof mode === "number") p.set("sim", String(mode));
  const q = p.toString();
  history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
}

// The recorder's keep-criteria, replicated as review-time hints so a
// pretty roll is visibly also a *legal* roll before it's kept.
const GAP_MIN = 1.0; // adjacent rest centers — protects the align slide
const NEAR_MAX = 0.9; // |restX - slotX|
const EDGE = 3.2; // visible canvas edge in local units
const SETTLE_MAX = 3.0; // s of sim before the capture

type Badge = { label: string; ok: boolean };

function judge(take: RollInTake, meta: TakeMeta): Badge[] {
  const lastI = take.n - 1;
  const finalsX = take.dice.map((d) => d.p[lastI * 3]);
  // Worst rotated visual reach in x across every keyframe: half-extent 0.44
  // spread over the rotation's x-row L1 norm, plus the 0.06 bevel.
  let maxReach = 0;
  for (const d of take.dice) {
    for (let k = 0; k < take.n; k++) {
      const x = d.p[k * 3];
      const qx = d.q[k * 4];
      const qy = d.q[k * 4 + 1];
      const qz = d.q[k * 4 + 2];
      const qw = d.q[k * 4 + 3];
      const row =
        Math.abs(1 - 2 * (qy * qy + qz * qz)) +
        Math.abs(2 * (qx * qy - qw * qz)) +
        Math.abs(2 * (qx * qz + qw * qy));
      maxReach = Math.max(maxReach, Math.abs(x) + 0.44 * row + 0.06);
    }
  }
  return [
    {
      label: "sim clean",
      ok: !meta.crashed && !meta.timedOut && meta.nudges === 0,
    },
    { label: "near slots", ok: meta.finalErr.every((e) => e <= NEAR_MAX) },
    {
      label: "in order",
      ok: finalsX.every((x, i) => i === 0 || x - finalsX[i - 1] >= GAP_MIN),
    },
    { label: "on screen", ok: maxReach <= EDGE },
    { label: "settled", ok: meta.duration <= SETTLE_MAX },
  ];
}

export default function DiceDevPanel({ onRemount }: { onRemount: () => void }) {
  const [mode, setMode] = useState<Mode>(currentMode);
  const [roll, setRoll] = useState<{
    take: RollInTake;
    meta: TakeMeta;
    badges: Badge[];
  } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onTake = () => {
      const t = window.__rollInTake;
      if (!t) return;
      setRoll({ ...t, badges: judge(t.take, t.meta) });
      setSaved(null);
    };
    window.addEventListener("roll-in-take", onTake);
    return () => window.removeEventListener("roll-in-take", onTake);
  }, []);

  const switchTo = (m: Mode) => {
    setMode(m);
    setRoll(null);
    setSaved(null);
    writeModeToUrl(m);
    onRemount();
  };

  const keep = async () => {
    if (!roll || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/keep-take", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ take: roll.take, meta: roll.meta }),
      });
      const body = (await res.json()) as { saved?: string; count?: number };
      setSaved(res.ok ? `saved (${body.count} kept)` : "save failed");
    } catch {
      setSaved("save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-3 left-3 z-50 flex flex-wrap items-center gap-2 rounded-lg bg-black/70 px-3 py-2 font-mono text-xs text-white shadow-lg">
      <select
        className="rounded bg-white/10 px-1 py-0.5"
        value={typeof mode === "number" ? `take-${mode}` : mode}
        onChange={(e) => {
          const v = e.target.value;
          switchTo(
            v === "random" || v === "live" ? v : Number(v.replace("take-", "")),
          );
        }}
      >
        <option value="random">random baked</option>
        <option value="live">live roll</option>
        {TAKES.map((_, i) => (
          <option key={i} value={`take-${i + 1}`}>
            sim {i + 1}
          </option>
        ))}
      </select>
      <button
        className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25"
        onClick={() => switchTo(mode === "live" ? "live" : mode)}
      >
        replay
      </button>
      <button
        className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25"
        onClick={() => switchTo("live")}
      >
        roll
      </button>
      {mode === "live" && roll && (
        <>
          {roll.badges.map((b) => (
            <span
              key={b.label}
              className={b.ok ? "text-emerald-300" : "text-red-300"}
            >
              {b.ok ? "✓" : "✗"} {b.label}
            </span>
          ))}
          <button
            className="rounded bg-emerald-500/30 px-2 py-0.5 hover:bg-emerald-500/50 disabled:opacity-40"
            disabled={busy || saved !== null}
            onClick={keep}
          >
            {saved ?? "keep"}
          </button>
        </>
      )}
    </div>
  );
}
