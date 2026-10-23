"use client";

import { usePathname } from "next/navigation";
import { CHAPTERS, LAST_YEAR_CHAPTERS, type Chapter } from "@/v2/data/chapters";
import ExpandingNav from "./nav/ExpandingNav";
import RulebookHeader from "./RulebookHeader";

// Pages that read as the game's rulebook, each under the sticky header with
// its own chapters.
const RULEBOOKS: Record<string, Chapter[]> = {
  "/": Object.values(CHAPTERS),
  "/last-year": Object.values(LAST_YEAR_CHAPTERS),
};

// Rulebook pages get the chapter header. Every other page keeps the corner
// die that unfolds into the links.
export default function SiteShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const chapters = RULEBOOKS[usePathname()];
  return (
    <>
      {chapters ? <RulebookHeader chapters={chapters} /> : <ExpandingNav />}
      {/* Symmetric gutter so the page's center doesn't shift under the corner nav. */}
      <main
        className={`flex-1 overflow-x-clip ${chapters ? "" : "md:px-20 lg:px-24"}`}
      >
        {children}
      </main>
    </>
  );
}
