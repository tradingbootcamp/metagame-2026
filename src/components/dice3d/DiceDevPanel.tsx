"use client";

import { useCallback, useEffect, useState } from "react";
import * as THREE from "three";
import type { RollInTake } from "./introDriver";
import type { TakeMeta } from "./physicsRollIn";
import {
  SPIN_LABELS,
  matchRetcon,
  retconOptions,
  type RetconFaceGroup,
} from "./cubeRetcon";
import { setTableauPreview } from "./tableauPreview";

// Dev-only curation panel (Dice.tsx mounts it only in development): throw fresh
// live rolls, re-watch the one just thrown, keep the good ones, and replay or
// delete any roll kept earlier. The dropdown lists the kept rolls in
// src/components/dice3d/takes/ (served by /api/dev/keep-take), which IS the
// shipped set — keeping a roll ships it, deleting one unships it.
//
// Playing an arbitrary take works through window.__replayTake: the panel queues
// a take there and remounts Dice3D, which consumes it. Live mode is a URL param
// the intro already reads (?record / ?launch), so mode changes rewrite those and
// remount too — the intro paths themselves stay untouched.
//
// The tableau picker is the exception: it pushes orientations through
// tableauPreview instead of remounting, because a remount would replay the
// whole 2.5s roll on every cycler click.

type Mode = "live" | "kept" | { file: string };
type Listed = {
  name: string;
  meta: TakeMeta;
  restX: number[];
  n: number;
  hz: number;
};

function writeModeToUrl(mode: Mode, low: boolean) {
  const p = new URLSearchParams(window.location.search);
  p.delete("sim");
  p.delete("record");
  p.delete("launch");
  if (mode === "live") {
    p.set("record", "1");
    if (low) p.set("launch", "low");
  }
  const q = p.toString();
  history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
}

// Legality check on a roll — a good-looking roll can still put a die off-camera
// or out of slot order, and a kept roll ships as-is.
const EDGE = 3.18; // visible canvas edge in local units, minus a hair
const GAP_MIN = 1.0; // adjacent rest centers — protects the align slide
const NEAR_MAX = 0.9; // |restX - slotX|

type Badge = { label: string; ok: boolean };

// True x-reach of the beveled die at a pose: 0.44·Σ|basis.x| + 0.06, exact from
// 0.5 face-on to ~0.822 corner-on.
function halfExtentX(q: number[], o: number): number {
  const x = q[o];
  const y = q[o + 1];
  const z = q[o + 2];
  const w = q[o + 3];
  return (
    0.44 *
      (Math.abs(1 - 2 * (y * y + z * z)) +
        Math.abs(2 * (x * y - w * z)) +
        Math.abs(2 * (x * z + w * y))) +
    0.06
  );
}

// Every die must be fully on camera from the moment it matters: clear of the
// right edge once it has reached the floor, and clear of the left edge once it
// has fully entered — the off-screen-left entry is by design, so measuring
// every frame (as this check used to) marks every roll as failing.
function onScreen(take: RollInTake): boolean {
  for (const die of take.dice) {
    let touched = false;
    let entered = false;
    for (let k = 0; k < take.n; k++) {
      const x = die.p[k * 3];
      const h = halfExtentX(die.q, k * 4);
      if (die.p[k * 3 + 1] < 0.55) touched = true;
      if (touched && x + h > EDGE) return false;
      if (x - h >= -EDGE) entered = true;
      else if (entered) return false;
    }
    if (!touched || !entered) return false;
  }
  return true;
}

function judge(meta: TakeMeta, restX: number[], take: RollInTake): Badge[] {
  return [
    {
      label: "sim clean",
      ok: !meta.crashed && !meta.timedOut && meta.nudges === 0,
    },
    { label: "near slots", ok: meta.finalErr.every((e) => e <= NEAR_MAX) },
    {
      label: "in order",
      ok: restX.every((x, i) => i === 0 || x - restX[i - 1] >= GAP_MIN),
    },
    { label: "on screen", ok: onScreen(take) },
  ];
}

const shortName = (f: string) => f.replace(/^take-|\.json$/g, "").slice(-6);

const IDENTITY = new THREE.Quaternion();

function Cycler({
  label,
  width,
  onStep,
}: {
  label: string;
  width: string;
  onStep: (delta: number) => void;
}) {
  const arrow = "rounded bg-white/15 px-1 hover:bg-white/25";
  return (
    <span className="flex items-center gap-0.5">
      <button className={arrow} onClick={() => onStep(-1)}>
        ‹
      </button>
      <span className={`${width} text-center text-white/80`}>{label}</span>
      <button className={arrow} onClick={() => onStep(1)}>
        ›
      </button>
    </span>
  );
}

export default function DiceDevPanel({ onRemount }: { onRemount: () => void }) {
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).has("record") ? "live" : "kept",
  );
  const [low, setLow] = useState<boolean>(
    () => new URLSearchParams(window.location.search).get("launch") === "low",
  );
  const [listed, setListed] = useState<Listed[]>([]);
  const [roll, setRoll] = useState<{
    take: RollInTake;
    meta: TakeMeta;
    badges: Badge[];
  } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false); // delete needs a second click
  const [hold, setHold] = useState(false);
  // Per-die face × spin options for the selected take, and the current pick.
  const [groups, setGroups] = useState<RetconFaceGroup[][] | null>(null);
  const [picks, setPicks] = useState<{ face: number; spin: number }[]>([]);
  const [savedOrient, setSavedOrient] = useState<string | null>(null);

  const refreshList = useCallback(
    () =>
      fetch("/api/dev/keep-take")
        .then((r) => r.json() as Promise<{ takes?: Listed[] }>)
        .then((body) => setListed(body.takes ?? []))
        .catch(() => setListed([])),
    [],
  );
  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // The live sim publishes each finished take on window; pick it up for badges.
  useEffect(() => {
    const onTake = () => {
      const t = window.__rollInTake;
      if (!t) return;
      const restX = t.take.dice.map((d) => d.p[(t.take.n - 1) * 3]);
      setRoll({ ...t, badges: judge(t.meta, restX, t.take) });
      setSaved(null);
    };
    window.addEventListener("roll-in-take", onTake);
    return () => window.removeEventListener("roll-in-take", onTake);
  }, []);

  // Queue a take for the next mount and remount, so an arbitrary roll (one kept
  // earlier, or the one just thrown) plays without a page reload.
  const play = (take: RollInTake) => {
    window.__replayTake = take;
    onRemount();
  };

  const selectCurated = async (file: string) => {
    setMode({ file });
    setSaved(null);
    setSavedOrient(null);
    setArmed(false);
    writeModeToUrl({ file }, low);
    try {
      const res = await fetch(
        `/api/dev/keep-take?file=${encodeURIComponent(file)}`,
      );
      const body = (await res.json()) as { take: RollInTake; meta: TakeMeta };
      const restX = body.take.dice.map((d) => d.p[(body.take.n - 1) * 3]);
      const g = body.take.dice.map((_, i) => retconOptions(body.take, i));
      // Start from whatever the take already plays: its saved tableau, or the
      // raw sim output (identity) when it has none.
      const p = g.map((faces, i) =>
        matchRetcon(
          faces,
          body.take.retcon
            ? new THREE.Quaternion().fromArray(body.take.retcon[i])
            : IDENTITY,
        ),
      );
      setGroups(g);
      setPicks(p);
      setRoll({ ...body, badges: judge(body.meta, restX, body.take) });
      play(body.take);
    } catch {
      setRoll(null);
      setGroups(null);
    }
  };

  const switchTo = (m: "live" | "kept", l: boolean = low) => {
    delete window.__replayTake; // stop replaying whatever was selected
    setTableauPreview({ hold: false, retcon: null });
    setHold(false);
    setGroups(null);
    setMode(m);
    setLow(l);
    setRoll(null);
    setSaved(null);
    setSavedOrient(null);
    setArmed(false);
    writeModeToUrl(m, l);
    onRemount();
  };

  const cycle = (die: number, kind: "face" | "spin", delta: number) => {
    setPicks((prev) =>
      prev.map((p, i) =>
        i !== die
          ? p
          : kind === "face"
            ? { face: (p.face + delta + 6) % 6, spin: p.spin }
            : { face: p.face, spin: (p.spin + delta + 4) % 4 },
      ),
    );
    setSavedOrient(null);
  };

  // Push the pick to playback, which re-reads it every frame — no remount, so
  // the dice re-pose on the next frame instead of replaying the roll.
  useEffect(() => {
    if (!groups) return;
    setTableauPreview({
      retcon: picks.map((p, i) => groups[i][p.face].spins[p.spin]),
    });
  }, [groups, picks]);

  const saveOrient = async () => {
    if (typeof mode !== "object" || !groups || busy) return;
    setBusy(true);
    try {
      const retcon = picks.map((p, i) =>
        groups[i][p.face].spins[p.spin]
          .toArray()
          .map((v) => Math.round(v * 1e6) / 1e6),
      );
      const res = await fetch("/api/dev/keep-take", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: mode.file, retcon }),
      });
      setSavedOrient(res.ok ? "saved" : "save failed");
    } catch {
      setSavedOrient("save failed");
    } finally {
      setBusy(false);
    }
  };

  // Re-watch whatever is loaded: the exact take for a kept or live roll,
  // otherwise just a fresh mount of the random kept set.
  const replay = () => {
    if (roll) play(roll.take);
    else onRemount();
  };

  // Hold is read when the driver decides whether to run the tail, so it only
  // takes effect from a fresh mount.
  const toggleHold = (on: boolean) => {
    setTableauPreview({ hold: on });
    setHold(on);
    replay();
  };

  const keep = async () => {
    if (!roll || busy || mode !== "live") return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/keep-take", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ take: roll.take, meta: roll.meta }),
      });
      const body = (await res.json()) as { saved?: string; count?: number };
      setSaved(res.ok ? `saved (${body.count})` : "save failed");
      await refreshList();
    } catch {
      setSaved("save failed");
    } finally {
      setBusy(false);
    }
  };

  // Unship the selected kept roll. Two-step rather than a confirm() dialog,
  // which would block the page (and any browser automation driving it). The arm
  // lapses on a timer rather than on blur — a dev-server hot reload re-renders
  // the panel, and a focus-based disarm would swallow the confirming click.
  const remove = async () => {
    if (typeof mode !== "object" || busy) return;
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/dev/keep-take?file=${encodeURIComponent(mode.file)}`, {
        method: "DELETE",
      });
      await refreshList();
      switchTo("kept"); // clears the queued replay of the take just deleted
    } finally {
      setArmed(false);
      setBusy(false);
    }
  };

  const selectValue = typeof mode === "object" ? `file:${mode.file}` : mode;

  return (
    <div className="fixed bottom-3 left-3 z-50 flex flex-col gap-2 rounded-lg bg-black/70 px-3 py-2 font-mono text-xs text-white shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded bg-white/10 px-1 py-0.5"
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "live" || v === "kept") switchTo(v);
            else void selectCurated(v.slice("file:".length));
          }}
        >
          <option value="kept">kept (random)</option>
          <option value="live">live roll</option>
          {listed.length > 0 && (
            <optgroup label={`kept rolls (${listed.length})`}>
              {listed.map((t, i) => (
                <option key={t.name} value={`file:${t.name}`}>
                  {`#${i + 1} · ${shortName(t.name)} · ${t.meta.duration.toFixed(1)}s`}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <button
          className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25"
          onClick={replay}
        >
          replay
        </button>
        <button
          className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25"
          onClick={() => switchTo("live")}
        >
          roll
        </button>
        {typeof mode === "object" && (
          <button
            className="rounded bg-red-500/30 px-2 py-0.5 hover:bg-red-500/50 disabled:opacity-40"
            disabled={busy}
            onClick={remove}
          >
            {armed ? "sure?" : "delete"}
          </button>
        )}
        {mode === "live" && (
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={low}
              onChange={(e) => switchTo("live", e.target.checked)}
            />
            low
          </label>
        )}
        {typeof mode === "object" && (
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={hold}
              onChange={(e) => toggleHold(e.target.checked)}
            />
            hold at rest
          </label>
        )}
        {roll && (
          <>
            {roll.badges.map((b) => (
              <span
                key={b.label}
                className={b.ok ? "text-emerald-300" : "text-red-300"}
              >
                {b.ok ? "✓" : "✗"} {b.label}
              </span>
            ))}
            {mode === "live" && (
              <button
                className="rounded bg-emerald-500/30 px-2 py-0.5 hover:bg-emerald-500/50 disabled:opacity-40"
                disabled={busy || saved !== null}
                onClick={keep}
              >
                {saved ?? "keep"}
              </button>
            )}
          </>
        )}
      </div>
      {groups && typeof mode === "object" && (
        <div className="flex flex-col gap-1 border-t border-white/15 pt-2">
          {picks.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-white/50">die {i + 1}</span>
              <Cycler
                label={groups[i][p.face].label}
                width="w-20"
                onStep={(d) => cycle(i, "face", d)}
              />
              <Cycler
                label={SPIN_LABELS[p.spin]}
                width="w-4"
                onStep={(d) => cycle(i, "spin", d)}
              />
            </div>
          ))}
          <button
            className="mt-1 rounded bg-emerald-500/30 px-2 py-0.5 hover:bg-emerald-500/50 disabled:opacity-40"
            disabled={busy}
            onClick={saveOrient}
          >
            {savedOrient ?? "save orientation"}
          </button>
        </div>
      )}
    </div>
  );
}
