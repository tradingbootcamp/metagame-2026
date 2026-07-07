"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FaThLarge, FaListUl } from "react-icons/fa";
import LastYearSessionModal from "./LastYearSessionModal";
import {
  days,
  formatPacificTime,
  hostNames,
  offsetPx,
  scheduleLocations,
  slotLabel,
  startsInSlot,
  heightPx,
  SLOT_PX,
  type Day,
  type Session,
} from "@/lib/last-year-schedule";
import { LEGEND, sessionStyle } from "@/lib/schedule-styles";

type View = "grid" | "list";
type OpenFn = (s: Session) => void;

// Grid template: a narrow sticky time column + one min-width column per location.
// Column/time widths come from CSS vars so they can shrink on phones (set on the
// scroll container below) — narrower columns let more venues fit on a small screen.
const GRID_COLS = `var(--time-w) repeat(${scheduleLocations.length}, minmax(var(--col-w), 1fr))`;

function AgeMark({ ages }: { ages: Session["ages"] }) {
  if (ages === "ADULTS")
    return (
      <span aria-label="18+" className="shrink-0">
        🔞
      </span>
    );
  if (ages === "KIDS")
    return (
      <span aria-label="Kid-friendly" className="shrink-0">
        🐥
      </span>
    );
  return null;
}

function SessionBlock({
  session,
  slotStart,
  onOpen,
}: {
  session: Session;
  slotStart: number;
  onOpen: OpenFn;
}) {
  const hosts = hostNames(session);
  return (
    <button
      type="button"
      onClick={() => onOpen(session)}
      title={`${session.title}${hosts.length ? " — " + hosts.join(", ") : ""}`}
      style={{
        top: offsetPx(session, slotStart),
        height: heightPx(session),
        ...sessionStyle(session),
      }}
      className="absolute inset-x-0.5 z-10 overflow-hidden rounded-md border p-1.5 text-left text-[#1b1530] transition-shadow hover:z-20 hover:shadow-[0_2px_10px_rgba(27,21,48,0.25)]"
    >
      <span className="flex items-start gap-1 text-[13px] leading-tight font-semibold">
        <span className="line-clamp-3">{session.title}</span>
        <AgeMark ages={session.ages} />
      </span>
      {hosts.length > 0 && (
        <span className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-[#1b1530]/70">
          {hosts.join(", ")}
        </span>
      )}
    </button>
  );
}

function GridDay({ day, onOpen }: { day: Day; onOpen: OpenFn }) {
  return (
    /* Column + time widths are CSS vars so phones get narrower columns (more
       venues visible at once) than wider screens. */
    <div className="overflow-x-auto border-[1.5px] border-[#1b1530]/15 bg-[#f4ecd2] [--col-w:104px] [--time-w:44px] sm:[--col-w:120px] sm:[--time-w:56px]">
      <div className="min-w-fit">
        {/* Location header row (sticky on vertical scroll) */}
        <div
          className="sticky top-0 z-30 grid bg-[#efe4c6]"
          style={{ gridTemplateColumns: GRID_COLS }}
        >
          <div className="sticky left-0 z-40 border-r border-b border-[#1b1530]/15 bg-[#efe4c6]" />
          {scheduleLocations.map((loc) => (
            <div
              key={loc.id}
              className="border-r border-b border-[#1b1530]/15 px-2 py-2 last:border-r-0"
            >
              {loc.thumbnail_url && (
                <div className="relative mb-1.5 h-14 w-full overflow-hidden rounded-sm">
                  <Image
                    src={loc.thumbnail_url}
                    alt=""
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="text-sm leading-tight font-bold">{loc.name}</div>
              {loc.campus_location && (
                <div className="text-[11px] leading-tight text-[#1b1530]/55">
                  {loc.campus_location}
                </div>
              )}
              {loc.capacity && (
                <div className="text-[11px] leading-tight text-[#1b1530]/55">
                  Max {loc.capacity}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Time-slot rows */}
        <div className="grid" style={{ gridTemplateColumns: GRID_COLS }}>
          {day.slots.map((slotStart) => (
            <div key={slotStart} className="contents">
              <div
                className="sticky left-0 z-20 flex justify-center border-r border-b border-[#1b1530]/15 bg-[#f4ecd2] pt-1 text-[11px] text-[#1b1530]/55"
                style={{ height: SLOT_PX }}
              >
                {slotLabel(slotStart)}
              </div>
              {scheduleLocations.map((loc) => {
                const inSlot = day.sessions.filter(
                  (s) => s.location_id === loc.id && startsInSlot(s, slotStart),
                );
                return (
                  <div
                    key={loc.id}
                    className="relative border-r border-b border-[#1b1530]/10 last:border-r-0"
                    style={{ height: SLOT_PX }}
                  >
                    {inSlot.map((s) => (
                      <SessionBlock
                        key={s.id}
                        session={s}
                        slotStart={slotStart}
                        onOpen={onOpen}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session, onOpen }: { session: Session; onOpen: OpenFn }) {
  const hosts = hostNames(session);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(session)}
        className="flex w-full items-stretch gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#1b1530]/[0.04]"
      >
        <div className="w-14 shrink-0 pt-0.5 text-right sm:w-16">
          <div className="text-sm font-semibold whitespace-nowrap">
            {formatPacificTime(session.start_time)}
          </div>
          <div className="text-[11px] whitespace-nowrap text-[#1b1530]/50">
            {formatPacificTime(session.end_time)}
          </div>
        </div>
        <div
          aria-hidden
          className="w-1.5 shrink-0 rounded-full border"
          style={sessionStyle(session)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5 leading-tight font-semibold">
            <span>{session.title}</span>
            <AgeMark ages={session.ages} />
          </div>
          {(session.location?.name || hosts.length > 0) && (
            <div className="mt-0.5 text-[13px] text-[#1b1530]/65">
              {[session.location?.name, hosts.join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>
      </button>
    </li>
  );
}

function ListDay({ day, onOpen }: { day: Day; onOpen: OpenFn }) {
  return (
    <ol className="divide-y divide-[#1b1530]/10 border-[1.5px] border-[#1b1530]/15 bg-[#f4ecd2]">
      {day.sessions.map((s) => (
        <SessionRow key={s.id} session={s} onOpen={onOpen} />
      ))}
    </ol>
  );
}

export default function LastYearSchedule({
  variant = "tabbed",
  defaultView = "grid",
}: {
  /** "tabbed": one day at a time with a day switcher (the /last-year page).
   *  "sequential": all three days stacked in order (the home-page section). */
  variant?: "tabbed" | "sequential";
  defaultView?: View;
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const [view, setView] = useState<View>(defaultView);
  const [open, setOpen] = useState<{
    session: Session;
    dayName: string;
  } | null>(null);

  // Default to the list view on phones (grid is cramped on a narrow screen).
  // Runs once after mount so server + first client render stay in sync; the
  // setState is deferred into a timer so the react-hooks linter doesn't flag it.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const t = setTimeout(() => setView("list"), 0);
    return () => clearTimeout(t);
  }, []);

  const renderDay = (day: Day) => {
    const onOpen: OpenFn = (session) => setOpen({ session, dayName: day.name });
    return view === "grid" ? (
      <GridDay day={day} onOpen={onOpen} />
    ) : (
      <ListDay day={day} onOpen={onOpen} />
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Controls: day tabs (tabbed only) + view toggle */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {variant === "tabbed" && (
          <div
            role="tablist"
            aria-label="Conference day"
            className="inline-flex border-[1.5px] border-[#1b1530]/25"
          >
            {days.map((d, i) => {
              const active = i === dayIndex;
              return (
                <button
                  key={d.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setDayIndex(i)}
                  className={`px-4 py-2 font-[family-name:var(--font-bebas)] text-lg tracking-[0.06em] transition-colors sm:px-6 sm:text-xl ${
                    active
                      ? "bg-[#1b1530] text-[#f4ecd2]"
                      : "text-[#1b1530]/70 hover:bg-[#1b1530]/5"
                  } ${i > 0 ? "border-l-[1.5px] border-[#1b1530]/25" : ""}`}
                >
                  {d.name}
                  {/* keep "Sep 12" as one unit — wrap to its own line rather
                      than splitting between the month and the day */}
                  <span className="ml-1.5 inline-block text-sm whitespace-nowrap opacity-70">
                    {d.dateLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div
          role="group"
          aria-label="View"
          className="inline-flex border-[1.5px] border-[#1b1530]/25"
        >
          {(
            [
              { id: "grid", label: "Grid", Icon: FaThLarge },
              { id: "list", label: "List", Icon: FaListUl },
            ] as const
          ).map(({ id, label, Icon }, i) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setView(id)}
                className={`flex items-center gap-2 px-3 py-2.5 text-xs tracking-[0.12em] uppercase transition-colors ${
                  active
                    ? "bg-[#1b1530] text-[#f4ecd2]"
                    : "text-[#1b1530]/70 hover:bg-[#1b1530]/5"
                } ${i > 0 ? "border-l-[1.5px] border-[#1b1530]/25" : ""}`}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {LEGEND.map((entry) => (
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

      {variant === "tabbed" ? (
        renderDay(days[dayIndex])
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((d) => (
            <section key={d.key} className="flex flex-col gap-2.5">
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-[0.04em]">
                {d.name}
                <span className="ml-2 text-[#1b1530]/55">{d.dateLabel}</span>
              </h3>
              {renderDay(d)}
            </section>
          ))}
        </div>
      )}

      {open && (
        <LastYearSessionModal
          session={open.session}
          dayName={open.dayName}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
