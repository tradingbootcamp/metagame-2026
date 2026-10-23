import type { ReactNode } from "react";
import { cn } from "@/v2/lib/utils";

// A chapter's numbered rules (1.1, 1.2, …) between navy and hairline rules,
// as in a printed rulebook.
export default function RulebookRules({
  chapter,
  rules,
  className,
}: {
  chapter: number;
  rules: ReactNode[];
  className?: string;
}) {
  return (
    <ol className={cn("border-t-2 border-navy", className)}>
      {rules.map((rule, i) => (
        <li
          key={i}
          className="grid grid-cols-[52px_minmax(0,1fr)] gap-1 border-b border-line py-3 text-ink/80"
        >
          <b className="font-space-mono text-[13px] leading-[1.9] text-meeple">
            {chapter}.{i + 1}
          </b>
          <span>{rule}</span>
        </li>
      ))}
    </ol>
  );
}
