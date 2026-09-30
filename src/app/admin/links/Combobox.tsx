"use client";

import { useId, useState } from "react";
import { fieldClass } from "./ui";

// Text input with a filtered suggestion panel. Open fields accept whatever is
// typed (the last row offers to add it); closed fields are enforced server-side,
// this only steers. A typed value that matches an option case-insensitively is
// snapped to the option's spelling on pick and on blur, so "puzzle world" can't
// become a near-duplicate of "Puzzle World".

type Props = {
  name: string;
  label: string;
  value: string;
  options: readonly string[];
  open: boolean;
  required?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
};

const snap = (value: string, options: readonly string[]) =>
  options.find((o) => o.toLowerCase() === value.trim().toLowerCase()) ??
  value.trim();

export default function Combobox({
  name,
  label,
  value,
  options,
  open,
  required,
  maxLength,
  onChange,
}: Props) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(0);

  const needle = value.trim().toLowerCase();
  const matches = needle
    ? options.filter((o) => o.toLowerCase().includes(needle))
    : [...options];
  const exact = options.some((o) => o.toLowerCase() === needle);
  const addRow = open && needle && !exact ? value.trim() : null;
  const rows = addRow ? [...matches, addRow] : matches;
  const activeRow = Math.min(active, Math.max(rows.length - 1, 0));

  const pick = (row: string) => {
    onChange(snap(row, options));
    setExpanded(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!expanded) return setExpanded(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((activeRow + step + rows.length) % Math.max(rows.length, 1));
    } else if (e.key === "Enter") {
      if (!expanded || rows.length === 0) return;
      e.preventDefault();
      pick(rows[activeRow]);
    } else if (e.key === "Escape") {
      if (expanded) {
        e.preventDefault();
        setExpanded(false);
      }
    }
  };

  return (
    <div className="relative">
      <input
        name={name}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded && rows.length ? `${listId}-${activeRow}` : undefined
        }
        autoComplete="off"
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setExpanded(true);
          setActive(0);
        }}
        onFocus={() => setExpanded(true)}
        onBlur={() => {
          setExpanded(false);
          const snapped = snap(value, options);
          if (snapped !== value) onChange(snapped);
        }}
        onKeyDown={onKeyDown}
        className={fieldClass}
      />
      {expanded && rows.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-white py-1 text-sm shadow-lg"
        >
          {rows.map((row, i) => {
            const isAdd = addRow !== null && i === rows.length - 1;
            return (
              <li
                key={isAdd ? "\u0000add" : row}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeRow}
                // mousedown, not click: the input's blur would close the list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(row);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3 py-1.5 ${
                  i === activeRow ? "bg-navy/10 text-navy" : ""
                } ${isAdd ? "text-ink/70 italic" : ""}`}
              >
                {isAdd ? `Add "${row}"` : row}
              </li>
            );
          })}
          {open && !addRow && (
            <li
              aria-hidden
              className="border-t border-line px-3 py-1.5 text-xs text-ink/50 italic"
            >
              Not listed? Type a new one to add it.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
