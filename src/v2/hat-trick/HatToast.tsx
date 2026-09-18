"use client";

import { useEffect, useState } from "react";
import { HEADING } from "@/v2/components/styles";
import { HATS } from "./hats";
import { onCollect, type CollectEvent } from "./store";

// A small notice, bottom center, each time a hat is grabbed: which hat, and
// the running count. At the target count it announces the code instead.
export default function HatToast() {
  const [event, setEvent] = useState<CollectEvent | null>(null);

  useEffect(() => onCollect(setEvent), []);
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(() => setEvent(null), 4500);
    return () => clearTimeout(t);
  }, [event]);

  if (!event) return null;
  const hat = HATS[event.id];
  const locked = event.kind === "locked";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div
        key={`${event.id}-${event.count}`}
        className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-navy/[0.16] bg-white px-5 py-3 shadow-[0_12px_28px_rgba(23,48,89,0.18)] motion-safe:animate-[hat-toast_0.35s_ease-out]"
      >
        <span aria-hidden className="text-2xl">
          {locked ? "🚫" : "🎩"}
        </span>
        <div>
          <p className={`${HEADING} text-base text-navy`}>
            {locked
              ? `You're not yet eligible for the ${hat.name}.`
              : `You found the ${hat.name}!`}
          </p>
          <p className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
            {locked
              ? "Trick a few more people into giving you their hats first."
              : `Hat count: ${event.count}`}
          </p>
        </div>
      </div>
      <style>{`@keyframes hat-toast{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
