"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HEADING } from "@/v2/components/styles";
import { HATS, type Hat, type HatId } from "@/v2/hat-trick/hats";
import { formatHatFields, type Point, type Wear } from "./format";
import OutlineEditor from "./OutlineEditor";
import PlacementPreview from "./PlacementPreview";

type Saved = { points: Point[]; wear: Wear };
// One hat's working copy plus its undo/redo stacks (outline only).
type Draft = Saved & { past: Point[][]; future: Point[][] };
type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; file: string }
  | { kind: "error"; message: string };

const IDS = Object.keys(HATS) as HatId[];
const fresh = (s: Saved): Draft => ({ ...s, past: [], future: [] });
const same = (a: Saved, b: Saved) =>
  JSON.stringify([a.points, a.wear]) === JSON.stringify([b.points, b.wear]);
// "board_game_round_robin_2.4a3b2c1d.jpg" -> "board_game_round_robin_2.jpg"
// (the build hash's shape differs between dev and prod).
const fileName = (hat: Hat) =>
  (hat.image.src.split("/").pop() ?? "").replace(/\.[^.]+(?=\.\w+$)/, "");

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

export default function HatEditor() {
  const [id, setId] = useState<HatId>(IDS[0]);
  // What's on disk: hats.ts as imported, or what the last save wrote (the
  // import catches up on the next hot reload).
  const [savedOverrides, setSavedOverrides] = useState<
    Partial<Record<HatId, Saved>>
  >({});
  const [drafts, setDrafts] = useState<Partial<Record<HatId, Draft>>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [beneath, setBeneath] = useState<HatId[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const savedFor = (h: HatId): Saved =>
    savedOverrides[h] ?? { points: HATS[h].points, wear: HATS[h].wear };
  const draftFor = (h: HatId): Draft => drafts[h] ?? fresh(savedFor(h));
  const saved = savedFor(id);
  const draft = draftFor(id);
  const dirty = !same(draft, saved);
  const hat: Hat = { ...HATS[id], points: draft.points, wear: draft.wear };
  const others = IDS.filter((h) => h !== id).map((h) => HATS[h]);

  const update = (fn: (d: Draft) => Draft) =>
    setDrafts((all) => ({ ...all, [id]: fn(all[id] ?? fresh(savedFor(id))) }));

  const commitPoints = (points: Point[]) =>
    update((d) => ({ ...d, points, past: [...d.past, d.points], future: [] }));
  const beginDrag = () =>
    update((d) => ({ ...d, past: [...d.past, d.points], future: [] }));
  const movePoint = (i: number, p: Point) =>
    update((d) => ({
      ...d,
      points: d.points.map((q, j) => (j === i ? p : q)),
    }));
  const deletePoint = (i: number) => {
    commitPoints(draft.points.filter((_, j) => j !== i));
    setSelected(null);
  };
  const undo = () =>
    update((d) => {
      const prev = d.past[d.past.length - 1];
      if (!prev) return d;
      return {
        ...d,
        points: prev,
        past: d.past.slice(0, -1),
        future: [d.points, ...d.future],
      };
    });
  const redo = () =>
    update((d) => {
      const [next, ...rest] = d.future;
      if (!next) return d;
      return { ...d, points: next, past: [...d.past, d.points], future: rest };
    });
  const setWear = (wear: Wear) => update((d) => ({ ...d, wear }));
  const resetToSaved = () => {
    setDrafts((all) => ({ ...all, [id]: fresh(saved) }));
    setSelected(null);
  };

  const pick = (next: HatId) => {
    setId(next);
    setSelected(null);
    setBeneath((b) => b.filter((h) => h !== next));
    setStatus({ kind: "idle" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "Escape") {
        setSelected(null);
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selected !== null
      ) {
        e.preventDefault();
        deletePoint(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const code = formatHatFields(draft.points, draft.wear);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const save = async () => {
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/dev/hats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, points: draft.points, wear: draft.wear }),
      });
      const body = (await res.json()) as {
        error?: string;
        file?: string;
        points?: Point[];
        wear?: Wear;
      };
      if (!res.ok || !body.points || !body.wear) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const written = { points: body.points, wear: body.wear };
      setSavedOverrides((all) => ({ ...all, [id]: written }));
      setDrafts((all) => ({
        ...all,
        [id]: { ...(all[id] ?? fresh(written)), ...written },
      }));
      setStatus({ kind: "saved", file: body.file ?? "hats.ts" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const resetGame = () => {
    try {
      localStorage.removeItem("hat-trick");
    } catch {
      // nothing to clear
    }
  };

  return (
    <main className="min-h-screen bg-cream p-4 text-ink lg:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className={`${HEADING} text-2xl text-navy`}>Hat Editor</h1>
          <p className="mt-1 text-sm text-ink/70">
            Trace each hat&rsquo;s outline on its photo and place it on the
            &ldquo;You?&rdquo; silhouette. Dev only; Save writes to hats.ts.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/" className="underline underline-offset-2">
            Home
          </Link>
          <Link href="/team" className="underline underline-offset-2">
            Team
          </Link>
          <button
            type="button"
            onClick={resetGame}
            title="Forget any hats already grabbed on this browser (clears localStorage)"
            className="rounded border border-navy/30 bg-white px-2 py-1 text-xs hover:border-navy"
          >
            Reset game
          </button>
        </nav>
      </header>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="flex shrink-0 flex-col gap-2 lg:w-52">
          <p className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
            Hat
          </p>
          {IDS.map((h) => {
            const changed = !same(draftFor(h), savedFor(h));
            return (
              <button
                key={h}
                type="button"
                onClick={() => pick(h)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  h === id
                    ? "border-navy bg-navy text-cream"
                    : "border-navy/30 bg-white hover:border-navy"
                }`}
              >
                <span className="block font-bold">
                  {HATS[h].name}
                  {changed && (
                    <span title="Unsaved changes" className="text-meeple">
                      {" "}
                      •
                    </span>
                  )}
                </span>
                <span className="block truncate font-space-mono text-[11px] opacity-70">
                  {fileName(HATS[h])}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={undo}
              disabled={draft.past.length === 0}
              className="rounded border border-navy/30 bg-white px-2 py-1 hover:border-navy disabled:opacity-40"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={draft.future.length === 0}
              className="rounded border border-navy/30 bg-white px-2 py-1 hover:border-navy disabled:opacity-40"
            >
              Redo
            </button>
            <button
              type="button"
              onClick={resetToSaved}
              disabled={!dirty}
              className="rounded border border-navy/30 bg-white px-2 py-1 hover:border-navy disabled:opacity-40"
            >
              Reset to saved
            </button>
          </div>
          <OutlineEditor
            hat={hat}
            points={draft.points}
            selected={selected}
            onSelect={setSelected}
            onCommit={commitPoints}
            onBeginDrag={beginDrag}
            onMove={movePoint}
            onDelete={deletePoint}
          />
        </section>

        <aside className="flex shrink-0 flex-col gap-4 lg:w-80">
          <div>
            <p className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
              On the silhouette
            </p>
            <div className="mt-2">
              <PlacementPreview
                hat={hat}
                others={others}
                beneath={beneath}
                onToggleBeneath={(h) =>
                  setBeneath((b) =>
                    b.includes(h) ? b.filter((x) => x !== h) : [...b, h],
                  )
                }
                wear={draft.wear}
                onWearChange={setWear}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
                hats.ts
              </p>
              <button
                type="button"
                onClick={copy}
                className="rounded border border-navy/30 bg-white px-2 py-1 text-xs hover:border-navy"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-navy/20 bg-white p-3 font-space-mono text-[11px] leading-snug whitespace-pre-wrap">
              {code}
            </pre>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={status.kind === "saving" || draft.points.length < 3}
                className="rounded-lg bg-meeple px-4 py-2 text-sm font-bold text-white hover:bg-meeple-dark disabled:opacity-40"
              >
                {status.kind === "saving" ? "Saving…" : "Save to hats.ts"}
              </button>
              <span
                className={`text-xs ${
                  status.kind === "error" ? "text-meeple" : "text-ink/60"
                }`}
              >
                {status.kind === "saved" && `Saved ${status.file}`}
                {status.kind === "error" && `Couldn't save: ${status.message}`}
                {status.kind === "idle" && dirty && "Unsaved changes"}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink/60">
              Save rewrites this hat&rsquo;s <code>points</code> and{" "}
              <code>wear</code> in src/v2/hat-trick/hats.ts and formats the
              file. Commit it when the hats look right on the site.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
