"use client";

import { useEffect, useId, useRef } from "react";
import {
  FaTimes,
  FaMapMarkerAlt,
  FaRegClock,
  FaUserFriends,
} from "react-icons/fa";
import {
  formatTimeRange,
  hostNames,
  type Session,
} from "@/lib/last-year-schedule";
import { sessionStyle } from "@/lib/schedule-styles";

const CATEGORY_LABEL: Record<string, string> = {
  talk: "Talk",
  workshop: "Workshop",
  game: "Game",
  other: "Other",
};

function agesLabel(ages: Session["ages"]): string | null {
  if (ages === "ADULTS") return "18+";
  if (ages === "KIDS") return "Kid-friendly";
  return null;
}

export default function LastYearSessionModal({
  session,
  dayName,
  onClose,
}: {
  session: Session;
  dayName: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape, mirroring the site's other modals.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hosts = hostNames(session);
  const ages = agesLabel(session.ages);
  const tags = [
    session.megagame ? "Megagame" : null,
    session.category ? CATEGORY_LABEL[session.category] : null,
    ages,
  ].filter(Boolean) as string[];

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1b1530]/70 p-4 font-[family-name:var(--font-space-grotesk)]"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-[520px] flex-col gap-5 overflow-y-auto bg-[#fff5e4] p-6 text-[#1b1530] shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center text-[#1b1530]/50 transition-colors hover:text-[#1b1530]"
        >
          <FaTimes size={18} />
        </button>

        {/* swatch strip echoing this session's grid color */}
        <span
          aria-hidden
          className="h-2 w-16 rounded-full border"
          style={sessionStyle(session)}
        />

        <h2
          id={titleId}
          className="pr-6 font-[family-name:var(--font-bebas)] text-[clamp(26px,6vw,38px)] leading-tight tracking-[0.03em]"
        >
          {session.title}
        </h2>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="border-[1.5px] border-[#1b1530]/25 px-2.5 py-0.5 text-xs tracking-[0.12em] text-[#1b1530]/70 uppercase"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <dl className="flex flex-col gap-2.5 text-[15px]">
          <div className="flex items-center gap-2.5">
            <FaRegClock aria-hidden className="shrink-0 text-[#eaa35a]" />
            <dd>
              {dayName}, {formatTimeRange(session.start_time, session.end_time)}
            </dd>
          </div>
          {session.location?.name && (
            <div className="flex items-center gap-2.5">
              <FaMapMarkerAlt aria-hidden className="shrink-0 text-[#eaa35a]" />
              <dd>{session.location.name}</dd>
            </div>
          )}
          {hosts.length > 0 && (
            <div className="flex items-center gap-2.5">
              <FaUserFriends aria-hidden className="shrink-0 text-[#eaa35a]" />
              <dd>{hosts.join(", ")}</dd>
            </div>
          )}
        </dl>

        {session.description && (
          <p className="text-[15px] leading-relaxed whitespace-pre-line text-[#1b1530]/85">
            {session.description}
          </p>
        )}
      </div>
    </div>
  );
}
