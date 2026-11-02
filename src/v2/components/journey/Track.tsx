import { Check, Star } from "lucide-react";
import { cn } from "@/v2/lib/utils";
import { TOKEN } from "./look";

// The journey's board: one space per step and a star at the end, joined by a
// rule that fills in behind you. Spaces you've passed can be clicked to go
// back; the one you're on is the tan token.
export default function Track({
  titles,
  current,
  onJump,
}: {
  titles: string[];
  /** The step you're on. */
  current: number;
  onJump: (index: number) => void;
}) {
  const spaces = [...titles, "Sent"];
  return (
    <nav aria-label="Your progress" className="mt-8">
      <ol className="flex items-center">
        {spaces.map((title, i) => {
          const passed = i < current;
          const here = i === current;
          const last = i === spaces.length - 1;
          return (
            <li key={i} className={cn("flex items-center", !last && "flex-1")}>
              <button
                type="button"
                disabled={!passed}
                onClick={() => onJump(i)}
                title={title}
                aria-label={`${title}${passed ? ", done" : here ? ", you're here" : ""}`}
                aria-current={here ? "step" : undefined}
                className={cn(
                  TOKEN,
                  "size-8 border-2 font-space-mono text-[12px] font-bold transition-[background-color,border-color,color,scale] duration-300 sm:size-9",
                  passed &&
                    "border-navy bg-navy text-cream hover:border-meeple hover:bg-meeple",
                  here && "scale-115 border-navy bg-tan text-navy",
                  !passed && !here && "border-navy/25 text-navy/40",
                )}
              >
                {passed ? (
                  <Check aria-hidden className="size-4" strokeWidth={3} />
                ) : last ? (
                  <Star aria-hidden className="size-4" />
                ) : (
                  i + 1
                )}
              </button>
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "h-[2px] flex-1 transition-colors duration-500",
                    passed ? "bg-navy" : "bg-navy/15",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
