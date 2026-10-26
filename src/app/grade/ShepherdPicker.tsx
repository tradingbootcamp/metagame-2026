"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { findShepherds, setShepherd } from "./actions";
import { swatch } from "@/lib/airtable-colors";
import { committeeLabel, PIPELINE_COLORS } from "@/lib/rfp-pipeline";
import type { Account } from "@/lib/rfp-sessions";

export type Shepherd = { userId: string; label: string };

const MENU_WIDTH = 288;

/**
 * The Shepherd pill as a combobox: click it to search every account by name
 * or email, with the committee offered before anything is typed. Saves on
 * pick, optimistically, the way InlineSelect does.
 *
 * The menu is portalled and fixed because the table clips its overflow.
 */
export default function ShepherdPicker({
  sessionId,
  value,
}: {
  sessionId: string;
  value: Shepherd | null;
}) {
  const [current, setCurrent] = useState(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Account[] | null>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const listId = useId();

  const tone = swatch(current ? PIPELINE_COLORS.shepherd[current.label] : "");

  useEffect(() => {
    if (!open) return;
    let live = true;
    const t = setTimeout(async () => {
      const found = await findShepherds(query);
      if (live) {
        setResults(found);
        setActive(0);
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, query]);

  // Fixed to the viewport, so follow the pill through scrolls and resizes.
  useEffect(() => {
    if (!open) return;
    const place = () =>
      setRect(anchor.current?.getBoundingClientRect() ?? null);
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults(null);
  };

  // Under two characters the server offers the committee; narrow that here.
  const q = query.trim().toLowerCase();
  const shown = (results ?? []).filter(
    (a) =>
      q.length >= 2 ||
      !q ||
      committeeLabel(a).toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q),
  );
  const clearable = current !== null;
  // Row 0 is "None" when there's something to clear.
  const rows = clearable ? shown.length + 1 : shown.length;

  function choose(next: Shepherd | null) {
    const previous = current;
    setCurrent(next);
    setFailed(null);
    close();
    startSaving(async () => {
      const result = await setShepherd(sessionId, next?.userId ?? null);
      if (result.error) {
        setCurrent(previous);
        setFailed(result.error);
        return;
      }
      if (result.value && next) setCurrent({ ...next, label: result.value });
    });
  }

  const pickAt = (i: number) => {
    if (clearable && i === 0) return choose(null);
    const a = shown[clearable ? i - 1 : i];
    if (a) choose({ userId: a.userId, label: committeeLabel(a) });
  };

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Would submit an enclosing form otherwise.
      e.preventDefault();
      pickAt(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  const pillClass = `w-full truncate rounded-full py-1 pr-5 pl-2.5 text-left text-xs font-medium outline-none ${
    saving ? "opacity-60" : ""
  }`;

  return (
    <span ref={anchor} className="relative block min-w-0">
      {open ? (
        <input
          autoFocus
          role="combobox"
          aria-label="Shepherd"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={rows ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          // Menu buttons prevent mousedown focus, so blur means "left".
          onBlur={close}
          placeholder="Search accounts"
          className={`${pillClass} border border-line bg-white text-ink ring-2 ring-ring/60`}
        />
      ) : (
        <button
          type="button"
          aria-label="Shepherd"
          aria-haspopup="listbox"
          title={failed ?? (current?.label || "Not set")}
          disabled={saving}
          onClick={() => setOpen(true)}
          style={tone ?? undefined}
          className={`${pillClass} cursor-pointer focus-visible:ring-2 focus-visible:ring-ring/60 ${
            failed ? "ring-2 ring-meeple" : ""
          } ${tone ? "" : "bg-ink/6 text-ink/55"}`}
        >
          {current?.label || "—"}
        </button>
      )}
      <span
        aria-hidden
        style={tone && !open ? { color: tone.color } : undefined}
        className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] opacity-70"
      >
        ▼
      </span>

      {open &&
        rect &&
        createPortal(
          <ul
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: rect.bottom + 4,
              left: Math.max(
                8,
                Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8),
              ),
              width: MENU_WIDTH,
            }}
            className="z-50 max-h-64 overflow-y-auto rounded-lg border border-line bg-white text-sm shadow-md"
          >
            {clearable && (
              <Option
                id={`${listId}-0`}
                active={active === 0}
                onPick={() => choose(null)}
              >
                <span className="text-ink/55">None</span>
              </Option>
            )}
            {shown.map((a, i) => {
              const index = clearable ? i + 1 : i;
              const label = committeeLabel(a);
              return (
                <Option
                  key={a.userId}
                  id={`${listId}-${index}`}
                  active={active === index}
                  onPick={() => pickAt(index)}
                >
                  <span className="font-medium text-ink">{label}</span>
                  {label !== a.email && (
                    <span className="block truncate text-xs text-ink/50">
                      {a.email}
                    </span>
                  )}
                </Option>
              );
            })}
            {results && shown.length === 0 && (
              <li className="px-3 py-2 text-xs text-ink/50">
                {q.length >= 2
                  ? "No account matches. They need to sign in once first."
                  : "Keep typing to search every account."}
              </li>
            )}
            {results === null && (
              <li className="px-3 py-2 text-xs text-ink/50">Searching…</li>
            )}
          </ul>,
          document.body,
        )}
    </span>
  );
}

function Option({
  id,
  active,
  onPick,
  children,
}: {
  id: string;
  active: boolean;
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li id={id} role="option" aria-selected={active}>
      <button
        type="button"
        tabIndex={-1}
        // Keeps focus in the input so its blur doesn't close the menu first.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onPick}
        className={`block w-full px-3 py-2 text-left ${
          active ? "bg-ink/5" : "hover:bg-ink/5"
        }`}
      >
        {children}
      </button>
    </li>
  );
}
