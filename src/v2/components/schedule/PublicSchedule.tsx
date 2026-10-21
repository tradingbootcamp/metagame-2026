"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaListUl, FaThLarge } from "react-icons/fa";
import {
  cellSessions,
  formatPacificTime,
  heightPx,
  hostNames,
  NO_ROOM,
  offsetPx,
  slotLabel,
  SLOT_PX,
  type Day,
  type Placed,
  type PublicLocation,
  type PublicSession,
} from "@/lib/schedule";
import { LEGEND } from "@/v2/lib/schedule-styles";
import { AgeMark, BlockSummary, blockStyle } from "./SessionBits";

type View = "grid" | "list";
type PublicDay = Day<PublicSession>;
type Column = {
  id: string;
  name: string;
  campusLocation: string | null;
  capacity: number | null;
  thumbnailUrl: string | null;
};

const href = (s: PublicSession) => `/schedule/${encodeURIComponent(s.slug)}`;

function SessionBlock({
  session,
  slotStart,
}: {
  session: Placed<PublicSession>;
  slotStart: number;
}) {
  return (
    <Link
      href={href(session)}
      title={`${session.title}${session.hosts.length ? " — " + hostNames(session) : ""}`}
      style={{
        top: offsetPx(session, slotStart),
        height: heightPx(session),
        ...blockStyle(session),
      }}
      className="absolute inset-x-0.5 z-10 block overflow-hidden rounded-md border p-1.5 text-left text-[#1b1530] transition-shadow hover:z-20 hover:shadow-[0_2px_10px_rgba(27,21,48,0.25)]"
    >
      <BlockSummary session={session} />
    </Link>
  );
}

function GridDay({ day, columns }: { day: PublicDay; columns: Column[] }) {
  const gridCols = `var(--time-w) repeat(${columns.length}, minmax(var(--col-w), 1fr))`;
  return (
    <div className="overflow-x-auto border-[1.5px] border-[#1b1530]/15 bg-background [--col-w:104px] [--time-w:44px] sm:[--col-w:120px] sm:[--time-w:56px]">
      <div className="min-w-fit">
        <div
          className="sticky top-0 z-30 grid bg-[#4096ff] text-white"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="sticky left-0 z-40 border-r border-b border-[#1b1530]/15 bg-[#4096ff]" />
          {columns.map((col) => (
            <div
              key={col.id}
              className="border-r border-b border-[#1b1530]/15 px-2 py-2 last:border-r-0"
            >
              {col.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- already thumbnail-sized
                <img
                  src={col.thumbnailUrl}
                  alt=""
                  className="mb-1.5 h-14 w-full rounded-sm object-cover"
                />
              )}
              <div className="text-sm leading-tight font-bold">{col.name}</div>
              {col.campusLocation && (
                <div className="text-[11px] leading-tight text-white/75">
                  {col.campusLocation}
                </div>
              )}
              {col.capacity && (
                <div className="text-[11px] leading-tight text-white/75">
                  Max {col.capacity}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          {day.slots.map((slotStart) => (
            <div key={slotStart} className="contents">
              <div
                className="sticky left-0 z-20 flex justify-center border-r border-b border-[#1b1530]/15 bg-background pt-1 text-[11px] text-[#1b1530]/55"
                style={{ height: SLOT_PX }}
              >
                {slotLabel(slotStart)}
              </div>
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="relative border-r border-b border-[#1b1530]/10 last:border-r-0"
                  style={{ height: SLOT_PX }}
                >
                  {cellSessions(day.sessions, col.id, slotStart).map((s) => (
                    <SessionBlock
                      key={s.id}
                      session={s}
                      slotStart={slotStart}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListDay({
  day,
  roomName,
}: {
  day: PublicDay;
  roomName: (id: string | null) => string | null;
}) {
  if (day.sessions.length === 0) {
    return (
      <p className="border-[1.5px] border-[#1b1530]/15 bg-background px-4 py-6 text-center text-sm text-[#1b1530]/55">
        Nothing on {day.name} yet.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-[#1b1530]/10 border-[1.5px] border-[#1b1530]/15 bg-background">
      {day.sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={href(s)}
            className="flex w-full items-stretch gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#1b1530]/[0.04]"
          >
            <div className="w-14 shrink-0 pt-0.5 text-right sm:w-16">
              <div className="text-sm font-semibold whitespace-nowrap">
                {formatPacificTime(s.startsAt)}
              </div>
              <div className="text-[11px] whitespace-nowrap text-[#1b1530]/50">
                {formatPacificTime(s.endsAt)}
              </div>
            </div>
            <div
              aria-hidden
              className="w-1.5 shrink-0 rounded-full border"
              style={blockStyle(s)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5 leading-tight font-semibold">
                <span>{s.title}</span>
                <AgeMark ages={s.ages} />
              </div>
              <div className="mt-0.5 text-[13px] text-[#1b1530]/65">
                {[roomName(s.locationId), hostNames(s)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

const TOGGLE = "inline-flex border-[1.5px] border-[#1b1530]/25";
const toggleButton = (active: boolean, i: number) =>
  `${active ? "bg-[#1b1530] text-[#f4ecd2]" : "text-[#1b1530]/70 hover:bg-[#1b1530]/5"} ${
    i > 0 ? "border-l-[1.5px] border-[#1b1530]/25" : ""
  }`;

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

  // Phones start on the list; deferred so server and first client render match.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const t = setTimeout(() => setView("list"), 0);
    return () => clearTimeout(t);
  }, []);

  const columns: Column[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    campusLocation: l.campusLocation,
    capacity: l.capacity,
    thumbnailUrl: l.thumbnailUrl,
  }));
  if (days.some((d) => d.sessions.some((s) => s.locationId === null))) {
    columns.push({
      id: NO_ROOM,
      name: "Room TBA",
      campusLocation: null,
      capacity: null,
      thumbnailUrl: null,
    });
  }
  const roomName = (id: string | null) =>
    locations.find((l) => l.id === id)?.name ?? null;
  const day = days[Math.min(dayIndex, days.length - 1)];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div role="tablist" aria-label="Conference day" className={TOGGLE}>
          {days.map((d, i) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={i === dayIndex}
              onClick={() => setDayIndex(i)}
              className={`px-4 py-2 font-[family-name:var(--font-bebas)] text-lg tracking-[0.06em] transition-colors sm:px-6 sm:text-xl ${toggleButton(i === dayIndex, i)}`}
            >
              {d.name}
              <span className="ml-1.5 inline-block text-sm whitespace-nowrap opacity-70">
                {d.dateLabel}
              </span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="View" className={TOGGLE}>
          {(
            [
              { id: "grid", label: "Grid", Icon: FaThLarge },
              { id: "list", label: "List", Icon: FaListUl },
            ] as const
          ).map(({ id, label, Icon }, i) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs tracking-[0.12em] uppercase transition-colors ${toggleButton(view === id, i)}`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

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

      {view === "grid" && columns.length > 0 ? (
        <GridDay day={day} columns={columns} />
      ) : (
        <ListDay day={day} roomName={roomName} />
      )}
    </div>
  );
}
