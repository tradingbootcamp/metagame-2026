"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown01,
  ArrowDownAZ,
  ArrowUp10,
  ArrowUpZA,
  Book,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// DICT: a little book on the hairline beside the rack. Closed, it's just the
// icon; open, a page drops down under it listing every word this browser has
// cast, five at a time, in found order or alphabetically, either way up. Just
// a list — nothing here casts.
const PAGE = 5;

// The sort menu's orderings.
const SORTS = [
  { key: "found", Icon: ArrowDown01, label: "First found" },
  { key: "found-desc", Icon: ArrowUp10, label: "Last found" },
  { key: "abc", Icon: ArrowDownAZ, label: "A to Z" },
  { key: "abc-desc", Icon: ArrowUpZA, label: "Z to A" },
] as const;

export default function Dict({ words }: { words: string[] }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState(0);
  const [page, setPage] = useState(0);
  const [menu, setMenu] = useState(false);
  // The panel clips while it's growing or shut, and holds its words back
  // until it's open; then it lets the sort menu hang out below it. A
  // fallback timer settles it if the transition never reports in.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setSettled(true), 400);
    return () => clearTimeout(t);
  }, [open]);
  const menuRef = useRef<HTMLDivElement>(null);

  // The menu closes on a click anywhere outside it, or Escape.
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const { key, Icon, label } = SORTS[sort];
  const sorted = key.startsWith("abc") ? [...words].sort() : [...words];
  if (key.endsWith("desc")) sorted.reverse();
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = sorted.slice(at * PAGE, at * PAGE + PAGE);

  const control =
    "rounded p-0.5 text-ink/50 transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-ink/50";

  return (
    <div className="relative animate-[scrabble-entry_400ms_ease-out]">
      {/* Backed, so the hairline stops either side of the book. */}
      <button
        type="button"
        aria-label={open ? "Close the word list" : "Words found"}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setSettled(false);
          setMenu(false);
        }}
        className="block rounded bg-background p-1 text-ink/70 transition-colors hover:text-ink"
      >
        {open ? <BookOpen className="size-5" /> : <Book className="size-5" />}
      </button>
      {/* Always mounted: the row grows from nothing so the page unfolds down
          out of the book rather than popping. Hung off the icon's right edge,
          so it stays on screen on a phone. */}
      <div
        className={`absolute top-full right-0 grid transition-[grid-template-rows,opacity,translate] duration-300 ease-out ${
          open
            ? "[grid-template-rows:1fr] opacity-100"
            : "pointer-events-none -translate-y-2 [grid-template-rows:0fr] opacity-0"
        }`}
        aria-hidden={!open}
        inert={!open}
        onTransitionEnd={(e) => {
          if (e.propertyName === "grid-template-rows") setSettled(open);
        }}
      >
        <div className={`min-h-0 ${settled ? "" : "overflow-hidden"}`}>
          <div className="flex w-32 rounded-md border border-ink/30 bg-background shadow-[0_1px_2px_rgba(27,27,27,0.12)]">
            <span className="w-1.5 shrink-0 rounded-l-[5px] bg-ink/60" />
            <div
              className={`flex-1 px-2 py-1.5 ${pages > 1 ? "h-[169px]" : "h-[144px]"}`}
            >
              {/* Nothing inside until the page is open; then it all comes in
                  at once. */}
              {settled && (
                <div className="animate-[scrabble-entry_200ms_ease-out]">
                  <div className="mb-1 flex items-center justify-between border-b border-ink/15 pb-1 font-mono text-[10px] tracking-wider text-ink/50 uppercase">
                    <span>Found {words.length}</span>
                    <span ref={menuRef} className="relative">
                      <button
                        type="button"
                        aria-label={`Sort: ${label}`}
                        aria-haspopup="menu"
                        aria-expanded={menu}
                        title={label}
                        onClick={() => setMenu((m) => !m)}
                        className={control}
                      >
                        <Icon className="size-3.5" />
                      </button>
                      {menu && (
                        <ul
                          role="menu"
                          className="absolute top-full right-0 z-10 mt-1 w-32 animate-[scrabble-entry_150ms_ease-out] rounded-md border border-ink/30 bg-background py-1 whitespace-nowrap normal-case shadow-[0_2px_6px_rgba(27,27,27,0.15)]"
                        >
                          {SORTS.map((s, i) => (
                            <li key={s.key} role="none">
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={i === sort}
                                onClick={() => {
                                  setSort(i);
                                  setPage(0);
                                  setMenu(false);
                                }}
                                className={`flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] tracking-normal hover:bg-ink/5 ${
                                  i === sort ? "text-ink" : "text-ink/60"
                                }`}
                              >
                                <s.Icon className="size-3.5 shrink-0" />
                                {s.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </span>
                  </div>
                  <ol className="h-[100px] font-mono text-xs leading-5 text-ink/80">
                    {shown.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                    {words.length === 0 && <li className="text-ink/40">—</li>}
                  </ol>
                  {pages > 1 && (
                    <p className="mt-1 flex items-center justify-between border-t border-ink/15 pt-1 font-mono text-[10px] text-ink/50">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={at === 0}
                        onClick={() => setPage(at - 1)}
                        className={control}
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <span>
                        {at + 1} / {pages}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={at >= pages - 1}
                        onClick={() => setPage(at + 1)}
                        className={control}
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
