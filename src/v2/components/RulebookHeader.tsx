"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Chapter } from "@/v2/data/chapters";
import { LogoDie } from "./nav/LogoDice";
import { useIsAdmin } from "./nav/useIsAdmin";
import { Button } from "./ui/button";
import { DISPLAY } from "./styles";

// A rulebook page's sticky header, in place of the corner die nav: the brand,
// the page's chapters (scrolling sideways on phones, the one in view lit),
// and tickets.
export default function RulebookHeader({ chapters }: { chapters: Chapter[] }) {
  const admin = useIsAdmin();
  const current = useCurrentChapter(chapters);
  return (
    <header className="sticky top-0 z-40 border-b-2 border-navy bg-background">
      {/* How far down the rulebook you are. */}
      <span
        aria-hidden
        className="rulebook-progress absolute inset-x-0 -bottom-[2px] h-[3px] bg-meeple"
      />
      <div className="mx-auto flex max-w-[1192px] items-center gap-3 px-4 py-2.5 sm:gap-5 sm:px-8">
        <Link
          href="/#home"
          className={`${DISPLAY} group flex shrink-0 items-center gap-2 text-[28px] leading-none tracking-[0.05em] text-navy`}
        >
          <LogoDie className="size-9 transition-transform duration-500 group-hover:rotate-[360deg] motion-reduce:transition-none" />
          <span className="max-[420px]:sr-only">Metagame</span>
        </Link>
        <nav
          aria-label="Rulebook chapters"
          className="flex min-w-0 flex-1 [scrollbar-width:none] gap-0.5 overflow-x-auto"
        >
          {chapters.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              aria-current={current === c.id ? "true" : undefined}
              className={`rounded-md px-1.5 py-1.5 font-space-mono text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-navy uppercase transition-colors hover:bg-sky ${
                current === c.id ? "bg-sky" : ""
              }`}
            >
              <b className="text-meeple">§{c.num}</b> {c.short}
            </a>
          ))}
          {admin && (
            <Link
              href="/admin"
              className="rounded-md px-1.5 py-1.5 font-space-mono text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-ink/60 uppercase hover:bg-sky"
            >
              Admin
            </Link>
          )}
        </nav>
        <Button asChild size="sm" className="max-[900px]:hidden">
          <Link href="/#tickets">Get tickets</Link>
        </Button>
      </div>
    </header>
  );
}

// The chapter crossing the upper middle of the screen, for the nav highlight.
function useCurrentChapter(chapters: Chapter[]) {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const els = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setCurrent(hit.target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [chapters]);
  return current;
}
