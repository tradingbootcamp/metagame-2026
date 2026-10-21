import type { CSSProperties } from "react";
import { hostNames, type Ages, type Category } from "@/lib/schedule";
import { CATEGORY_STYLES } from "@/v2/lib/schedule-styles";

// Pieces of a schedule session block shared by the admin editor and the
// public schedule.

export function AgeMark({ ages }: { ages: Ages | null }) {
  if (ages === "adults")
    return (
      <span aria-label="18+" className="shrink-0">
        🔞
      </span>
    );
  if (ages === "kids")
    return (
      <span aria-label="Kid-friendly" className="shrink-0">
        🐥
      </span>
    );
  return null;
}

export const blockStyle = (s: { category: Category | null }): CSSProperties =>
  CATEGORY_STYLES[s.category ?? "other"];

/** Title, age mark and hosts, as a grid block shows them. */
export function BlockSummary({
  session,
}: {
  session: { title: string; ages: Ages | null; hosts: { name: string }[] };
}) {
  return (
    <>
      <span className="flex items-start gap-1 text-[13px] leading-tight font-semibold">
        <span className="line-clamp-3">{session.title}</span>
        <AgeMark ages={session.ages} />
      </span>
      {session.hosts.length > 0 && (
        <span className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-[#1b1530]/70">
          {hostNames(session)}
        </span>
      )}
    </>
  );
}
