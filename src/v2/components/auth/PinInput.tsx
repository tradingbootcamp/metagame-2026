"use client";

import { useRef, useState } from "react";
import { cn } from "@/v2/lib/utils";

// One box per digit; the hidden input carries the joined value for the form.
// The first box takes the OS one-time-code autofill (a whole string at once),
// and paste anywhere spreads the digits across the boxes.
export default function PinInput({
  name,
  length = 6,
  disabled,
  onComplete,
}: {
  name: string;
  length?: number;
  disabled?: boolean;
  onComplete?: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length }, () => ""),
  );
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) =>
    refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const fill = (from: number, text: string) => {
    const incoming = text.replace(/\D/g, "").slice(0, length - from);
    if (!incoming) return;
    const next = [...digits];
    for (let i = 0; i < incoming.length; i++) next[from + i] = incoming[i];
    setDigits(next);
    const last = from + incoming.length;
    focus(last);
    if (next.every(Boolean)) onComplete?.();
  };

  return (
    <div className="flex items-center gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digit}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          onChange={(e) => {
            const text = e.target.value;
            if (!text) {
              const next = [...digits];
              next[i] = "";
              setDigits(next);
              return;
            }
            fill(i, text.length > 1 ? text : text.slice(-1));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              e.preventDefault();
              const next = [...digits];
              next[i - 1] = "";
              setDigits(next);
              focus(i - 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              focus(i - 1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              focus(i + 1);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            fill(i, e.clipboardData.getData("text"));
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            "size-12 rounded-lg border-[1.5px] border-navy/20 bg-white text-center font-space-mono text-2xl text-ink transition-colors outline-none focus:border-meeple disabled:opacity-60 sm:size-14",
          )}
        />
      ))}
      <input type="hidden" name={name} value={digits.join("")} />
    </div>
  );
}
