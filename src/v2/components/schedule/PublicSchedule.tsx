"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type Day,
  type PublicLocation,
  type PublicSession,
} from "@/lib/schedule";
import { LEGEND } from "@/v2/lib/schedule-styles";
import {
  buildColumns,
  DayTabs,
  GridDay,
  ListDay,
  ViewToggle,
  type View,
} from "./ScheduleViews";
import ScheduleSearch from "./ScheduleSearch";

type PublicDay = Day<PublicSession>;

const href = (s: PublicSession) => `/schedule/${encodeURIComponent(s.slug)}`;

export function CategoryLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {LEGEND.slice(0, 4).map((entry) => (
        <span key={entry.label} className="flex items-center gap-1.5 text-xs">
          <span
            aria-hidden
            className="h-3.5 w-3.5 rounded-sm border"
            style={entry.style}
          />
          {entry.label}
        </span>
      ))}
    </div>
  );
}

/** The published schedule, a day at a time; every session links to its page. */
export default function PublicSchedule({
  days,
  locations,
}: {
  days: PublicDay[];
  locations: PublicLocation[];
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const [view, setView] = useState<View>("grid");
  const router = useRouter();
  const pathname = usePathname();

  // Whichever session page is open, show its day underneath: a search pick,
  // a shared link, or the back button all land on the right tab. State is
  // adjusted during render on a path change rather than in an effect, so the
  // first paint is already on the right day.
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    const slug = decodeURIComponent(pathname.split("/")[2] ?? "");
    const i = slug
      ? days.findIndex((d) => d.sessions.some((s) => s.slug === slug))
      : -1;
    if (i >= 0) setDayIndex(i);
  }

  // Phones start on the list; deferred so server and first client render match.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const t = setTimeout(() => setView("list"), 0);
    return () => clearTimeout(t);
  }, []);

  const columns = buildColumns(
    locations,
    days.some((d) => d.sessions.some((s) => s.locationId === null)),
  );
  const roomName = (id: string | null) =>
    locations.find((l) => l.id === id)?.name ?? null;
  const day = days[Math.min(dayIndex, days.length - 1)];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex">
        <ScheduleSearch
          sessions={days.flatMap((d) => d.sessions)}
          roomName={(s) => roomName(s.locationId)}
          onPick={(s) => router.push(href(s), { scroll: false })}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <DayTabs days={days} index={dayIndex} onSelect={setDayIndex} />
        <ViewToggle view={view} onSelect={setView} />
      </div>

      <CategoryLegend />

      {view === "grid" && columns.length > 0 ? (
        <GridDay day={day} columns={columns} href={href} />
      ) : (
        <ListDay day={day} roomName={roomName} href={href} />
      )}
    </div>
  );
}
