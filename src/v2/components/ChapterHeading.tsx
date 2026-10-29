import { cn } from "@/v2/lib/utils";
import type { Chapter } from "@/v2/data/chapters";
import { ChapterRule } from "./dividers/DividerRow";
import { DISPLAY, SECTION_ANCHOR } from "./styles";

// The rulebook's page width: the brand mock's 1160px column.
export const PAGE = "mx-auto w-full max-w-[1192px] px-4 sm:px-8";

// A chapter head: "§n", the title in Bebas, and a plain-words gloss at the
// right (under the title on phones).
export function ChapterHeading({
  chapter,
  className,
}: {
  chapter: Chapter;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rulebook-rise flex flex-wrap items-baseline gap-x-4 gap-y-1",
        className,
      )}
    >
      {chapter.num !== undefined && (
        <span className="font-space-mono text-sm font-bold tracking-[0.1em] text-meeple">
          §{chapter.num}
        </span>
      )}
      <h2
        className={`${DISPLAY} text-[clamp(44px,6vw,72px)] leading-[0.9] tracking-[0.01em] text-balance text-navy`}
      >
        {chapter.title}
      </h2>
      <span className="w-full font-space-mono text-xs tracking-[0.12em] text-ink/60 uppercase md:ml-auto md:w-auto">
        {chapter.aka}
      </span>
    </div>
  );
}

// One chapter of the home page: a navy rule across the column, then the head
// and the chapter's content. With `rule`, a game divider is that rule (its
// minigame and the cover puzzle both play on it).
export default function ChapterSection({
  chapter,
  rule,
  children,
}: {
  chapter: Chapter;
  rule?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={chapter.id} className={SECTION_ANCHOR}>
      <div className={PAGE}>
        {rule && <ChapterRule>{rule}</ChapterRule>}
        <div
          className={rule ? "pt-4 pb-14" : "border-t-2 border-navy pt-11 pb-14"}
        >
          <ChapterHeading chapter={chapter} />
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </section>
  );
}
