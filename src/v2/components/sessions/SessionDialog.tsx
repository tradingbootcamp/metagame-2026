"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";
import type { Session2026 } from "@/v2/data/sessions-2026";
import { cn } from "@/v2/lib/utils";
import { DISPLAY } from "../styles";
import { hostLine, KINDS, STATUS } from "./kinds";

// One session's details in a pop-up, wherever a session is named: the
// sessions deck, the speaker cards, and §1 and §2 of the home page. Off the
// sessions page, `browse` adds a way to the whole list.
export default function SessionDialog({
  session,
  onClose,
  browse = false,
}: {
  session: Session2026 | null;
  onClose: () => void;
  browse?: boolean;
}) {
  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && onClose()}>
      {session && <Details s={session} browse={browse} />}
    </Dialog>
  );
}

function Details({ s, browse }: { s: Session2026; browse: boolean }) {
  const main = KINDS[s.kinds[0]];
  return (
    <DialogContent className="flex max-h-[85vh] max-w-[560px] flex-col gap-4 overflow-y-auto p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-2 pr-8">
        <span className="flex items-center gap-1.5 rounded-md bg-cream px-2 py-1 font-space-mono text-[10.5px] font-bold tracking-[0.12em] text-navy uppercase">
          <main.Icon aria-hidden className="size-3.5" />
          {main.label}
        </span>
        <span
          className={cn(
            "rounded-md px-2 py-1 font-space-mono text-[10.5px] font-bold tracking-[0.12em] uppercase",
            s.status === "review"
              ? "border border-dashed border-cream/60 text-cream"
              : STATUS[s.status].chip,
          )}
        >
          {STATUS[s.status].label}
        </span>
      </div>
      <DialogTitle
        className={cn(
          DISPLAY,
          "text-[clamp(30px,6vw,40px)] leading-[0.95] tracking-[0.01em]",
          !s.title && "text-cream/60",
        )}
      >
        {s.title ?? "Title to come"}
      </DialogTitle>
      <p className="font-space-mono text-xs tracking-[0.08em] text-cream/70 uppercase">
        {hostLine(s)}
        {s.duration && ` · ${s.duration}`}
      </p>
      <DialogDescription className="text-[15px] leading-relaxed whitespace-pre-line text-cream/85">
        {s.blurb || "No description yet."}
      </DialogDescription>
      {s.kinds.length > 1 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Kinds of play">
          {s.kinds.map((k) => (
            <li
              key={k}
              className="rounded-full border border-cream/25 px-2.5 py-0.5 text-xs text-cream/75"
            >
              {KINDS[k].label}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-cream/15 pt-3 text-sm">
        <p className="text-sky">{STATUS[s.status].line}</p>
        {browse && (
          <Link
            href="/sessions"
            className="font-bold text-cream underline underline-offset-4 hover:text-tan"
          >
            Every session →
          </Link>
        )}
      </div>
    </DialogContent>
  );
}
