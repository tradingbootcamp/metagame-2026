"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { fieldClass } from "../ui";

export type ToolCard = {
  href: string;
  name: string;
  blurb: string;
  keywords?: string[];
  icon: ReactNode;
};

export default function ToolsGrid({ tools }: { tools: ToolCard[] }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  // Not on touch devices: the keyboard would cover the grid at the desk.
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      input.current?.focus();
  }, []);
  const q = query.trim().toLowerCase();
  const shown = q
    ? tools.filter((t) =>
        [t.name, t.blurb, ...(t.keywords ?? [])].some((s) =>
          s.toLowerCase().includes(q),
        ),
      )
    : tools;

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        placeholder="Search tools…"
        aria-label="Search tools"
        ref={input}
        className={`${fieldClass} mb-4 sm:max-w-sm`}
      />
      {shown.length === 0 ? (
        <p className="text-sm text-ink/60">No tools match.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="group flex h-full gap-3 rounded-xl border border-line bg-white p-4 shadow-sm transition-colors hover:border-navy"
              >
                {t.icon}
                <div>
                  <span className="font-semibold text-navy group-hover:text-meeple">
                    {t.name}
                  </span>
                  <p className="text-sm text-ink/60">{t.blurb}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
