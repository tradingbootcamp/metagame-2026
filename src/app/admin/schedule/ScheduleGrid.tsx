"use client";

import { useState } from "react";
import { FaListUl, FaThLarge } from "react-icons/fa";
import {
  formatPacificTime,
  heightPx,
  offsetPx,
  slotLabel,
  startsInSlot,
  SLOT_PX,
  type Day,
  type PlacedSession,
  type ScheduleLocation,
  type ScheduleSession,
} from "@/lib/schedule";
import { CATEGORY_STYLES, LEGEND } from "@/v2/lib/schedule-styles";

type View = "grid" | "list";
type OpenFn = (s: ScheduleSession) => void;

/** Placed sessions with no room land in a column of their own. */
const NO_ROOM = "__none__";

function AgeMark({ ages }: { ages: ScheduleSession["ages"] }) {
  if (ages === "adults")
    return (
      <span aria-label="18+" className="shrink-0">
        🔞
      </span>
    );
  if (ages === "kids")
    return (
      <span aria-label="Kid-friendly" className="shrink-0">
        🐥
      </span>
    );
  return null;
}

const blockStyle = (s: ScheduleSession) =>
  CATEGORY_STYLES[s.category ?? "other"];

function SessionBlock({
  session,
  slotStart,
  onOpen,
}: {
  session: PlacedSession;
  slotStart: number;
  onOpen: OpenFn;
}) {
  const draft = session.status === "draft";
  return (
    <button
      type="button"
      onClick={() => onOpen(session)}
      title={`${session.title}${session.hosts.length ? " — " + session.hosts.join(", ") : ""}${draft ? " (draft)" : ""}`}
      style={{
        top: offsetPx(session, slotStart),
        height: heightPx(session),
        ...blockStyle(session),
      }}
      className={`absolute inset-x-0.5 z-10 overflow-hidden rounded-md border p-1.5 text-left text-[#1b1530] transition-shadow hover:z-20 hover:shadow-[0_2px_10px_rgba(27,21,48,0.25)] ${
        draft ? "border-dashed opacity-60" : ""
      }`}
    >
      <span className="flex items-start gap-1 text-[13px] leading-tight font-semibold">
        <span className="line-clamp-3">{session.title}</span>
        <AgeMark ages={session.ages} />
      </span>
      {session.hosts.length > 0 && (
        <span className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-[#1b1530]/70">
          {session.hosts.join(", ")}
        </span>
      )}
    </button>
  );
}

type Column = { id: string; name: string; detail: string | null };

function GridDay({
  day,
  columns,
  onOpen,
}: {
  day: Day;
  columns: Column[];
  onOpen: OpenFn;
}) {
  const gridCols = `var(--time-w) repeat(${columns.length}, minmax(var(--col-w), 1fr))`;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white [--col-w:104px] [--time-w:44px] sm:[--col-w:120px] sm:[--time-w:56px]">
      <div className="min-w-fit">
        <div
          className="sticky top-0 z-30 grid bg-navy text-white"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="sticky left-0 z-40 border-r border-b border-line bg-navy" />
          {columns.map((col) => (
            <div
              key={col.id}
              className="border-r border-b border-line px-2 py-2 last:border-r-0"
            >
              <div className="text-sm leading-tight font-bold">{col.name}</div>
              {col.detail && (
                <div className="text-[11px] leading-tight text-white/75">
                  {col.detail}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          {day.slots.map((slotStart) => (
            <div key={slotStart} className="contents">
              <div
                className="sticky left-0 z-20 flex justify-center border-r border-b border-line bg-white pt-1 text-[11px] text-ink/55"
                style={{ height: SLOT_PX }}
              >
                {slotLabel(slotStart)}
              </div>
              {columns.map((col) => {
                const inSlot = day.sessions.filter(
                  (s) =>
                    (s.locationId ?? NO_ROOM) === col.id &&
                    startsInSlot(s, slotStart),
                );
                return (
                  <div
                    key={col.id}
                    className="relative border-r border-b border-line/60 last:border-r-0"
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

function ListDay({
  day,
  roomName,
  onOpen,
}: {
  day: Day;
  roomName: (id: string | null) => string | null;
  onOpen: OpenFn;
}) {
  if (day.sessions.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-white px-4 py-6 text-center text-sm text-ink/50">
        Nothing on {day.name} yet.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-line rounded-xl border border-line bg-white">
      {day.sessions.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onOpen(s)}
            className="flex w-full items-stretch gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.04]"
          >
            <div className="w-14 shrink-0 pt-0.5 text-right sm:w-16">
              <div className="text-sm font-semibold whitespace-nowrap">
                {formatPacificTime(s.startsAt)}
              </div>
              <div className="text-[11px] whitespace-nowrap text-ink/50">
                {formatPacificTime(s.endsAt)}
              </div>
            </div>
            <div
              aria-hidden
              className={`w-1.5 shrink-0 rounded-full border ${s.status === "draft" ? "border-dashed opacity-60" : ""}`}
              style={blockStyle(s)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5 leading-tight font-semibold">
                <span>{s.title}</span>
                <AgeMark ages={s.ages} />
                {s.status === "draft" && (
                  <span className="ml-1 rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink/60 uppercase">
                    Draft
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[13px] text-ink/65">
                {[roomName(s.locationId) ?? "No room", s.hosts.join(", ")]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function ScheduleGrid({
  days,
  locations,
  onOpen,
}: {
  days: Day[];
  locations: ScheduleLocation[];
  onOpen: OpenFn;
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const [view, setView] = useState<View>("grid");

  const columns: Column[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    detail:
      [
        l.campusLocation,
        l.capacity ? `Max ${l.capacity}` : null,
        l.showInSchedule ? null : "hidden",
      ]
        .filter(Boolean)
        .join(" · ") || null,
  }));
  if (days.some((d) => d.sessions.some((s) => s.locationId === null))) {
    columns.push({ id: NO_ROOM, name: "No room", detail: "unassigned" });
  }
  const roomName = (id: string | null) =>
    locations.find((l) => l.id === id)?.name ?? null;

  const day = days[Math.min(dayIndex, days.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Conference day"
          className="inline-flex overflow-hidden rounded-lg border border-line bg-white"
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
                className={`px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
                  active ? "bg-navy text-white" : "text-ink/70 hover:bg-ink/5"
                } ${i > 0 ? "border-l border-line" : ""}`}
              >
                {d.name}
                <span className="ml-1.5 text-xs font-normal whitespace-nowrap opacity-70">
                  {d.dateLabel}
                </span>
                {d.sessions.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal opacity-70">
                    ({d.sessions.length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {LEGEND.slice(0, 4).map((entry) => (
              <span
                key={entry.label}
                className="flex items-center gap-1.5 text-xs text-ink/70"
              >
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-sm border"
                  style={entry.style}
                />
                {entry.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-ink/70">
              <span
                aria-hidden
                className="h-3 w-3 rounded-sm border border-dashed border-ink/40 bg-ink/5"
              />
              Draft
            </span>
          </div>
          <div
            role="group"
            aria-label="View"
            className="inline-flex overflow-hidden rounded-lg border border-line bg-white"
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
                  className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold transition-colors ${
                    active ? "bg-navy text-white" : "text-ink/70 hover:bg-ink/5"
                  } ${i > 0 ? "border-l border-line" : ""}`}
                >
                  <Icon size={11} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {view === "grid" ? (
        columns.length === 0 ? (
          <p className="rounded-xl border border-line bg-white px-4 py-6 text-center text-sm text-ink/50">
            Add a room to get a grid.
          </p>
        ) : (
          <GridDay day={day} columns={columns} onOpen={onOpen} />
        )
      ) : (
        <ListDay day={day} roomName={roomName} onOpen={onOpen} />
      )}
    </div>
  );
}
