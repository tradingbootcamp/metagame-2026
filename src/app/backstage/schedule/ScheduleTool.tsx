"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { addSample, clearSample, moveSession, type FormState } from "./actions";
import LocationForm from "./LocationForm";
import ScheduleGrid, { GrabHandle, type DropFn } from "./ScheduleGrid";
import SessionForm, { type SessionDefaults } from "./SessionForm";
import ScheduleSearch from "@/v2/components/schedule/ScheduleSearch";
import { buttonClass, smallButtonClass } from "../ui";
import {
  buildDays,
  EDITOR_DAYS,
  formatPacificDay,
  formatPacificTime,
  hostNames,
  isPlaced,
  movedTimes,
  openingDayIndex,
  pacificDayKey,
  VISIBILITY_LABEL,
  type Attendance,
  type ScheduleLocation,
  type ScheduleSession,
  type ViewerPlans,
} from "@/lib/schedule";

type Editing =
  | {
      kind: "session";
      session: ScheduleSession | null;
      defaults?: SessionDefaults;
    }
  | { kind: "location"; location: ScheduleLocation | null }
  | null;

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bebas text-xl tracking-wide text-navy">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

type Move = Pick<ScheduleSession, "id" | "startsAt" | "endsAt" | "locationId">;

export default function ScheduleTool({
  sessions: saved,
  locations,
  attendance,
  viewer,
  canSeed,
}: {
  sessions: ScheduleSession[];
  locations: ScheduleLocation[];
  attendance: Attendance;
  viewer: (ViewerPlans & { userId: string }) | null;
  canSeed: boolean;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const [dayIndex, setDayIndex] = useState(() =>
    openingDayIndex(buildDays(saved, EDITOR_DAYS)),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setEditing(null), []);
  // Picked up by its grip; stays held across scrolling and day tabs until a slot is clicked.
  const [held, setCarrying] = useState<ScheduleSession | null>(null);
  // A dropped session shows in its new slot while the move saves; a failed save snaps it back.
  const [sessions, applyMove] = useOptimistic(saved, (all, move: Move) =>
    all.map((s) => (s.id === move.id ? { ...s, ...move } : s)),
  );

  useEffect(() => {
    if (!held) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCarrying(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [held]);

  const days = useMemo(() => buildDays(sessions, EDITOR_DAYS), [sessions]);
  const carrying = held
    ? (sessions.find((s) => s.id === held.id) ?? null)
    : null;
  const unplaced = sessions.filter((s) => !isPlaced(s));
  const published = sessions.filter((s) => s.status === "published").length;
  const going = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(attendance).map(([id, a]) => [
          id,
          a.attendees.filter((x) => x.status === "going").length,
        ]),
      ),
    [attendance],
  );
  // The open session re-read from fresh props, so RSVP changes show up live.
  const openNow =
    editing?.kind === "session" && editing.session
      ? (sessions.find((s) => s.id === editing.session!.id) ?? editing.session)
      : null;
  const roomName = (id: string | null) =>
    locations.find((l) => l.id === id)?.name ?? null;

  const run = (action: () => Promise<FormState>) =>
    startTransition(async () => {
      setError((await action()).error ?? null);
    });

  const grab = (session: ScheduleSession) =>
    setCarrying((held) => (held?.id === session.id ? null : session));
  const drop: DropFn = (startsAt, locationId) => {
    if (!carrying) return;
    const id = carrying.id;
    const times = movedTimes(carrying, startsAt);
    setCarrying(null);
    startTransition(async () => {
      applyMove({
        id,
        startsAt: times.startsAt.toISOString(),
        endsAt: times.endsAt.toISOString(),
        locationId,
      });
      const result = await moveSession(id, startsAt.toISOString(), locationId);
      setError(result.error ?? null);
    });
  };

  const openSession = (session: ScheduleSession | null) =>
    setEditing({ kind: "session", session });
  const createAt = (defaults: SessionDefaults) =>
    setEditing({ kind: "session", session: null, defaults });
  const openLocation = (location: ScheduleLocation | null) =>
    setEditing({ kind: "location", location });
  // A search pick: show its day on the grid, then open it for editing.
  const jumpTo = (session: ScheduleSession) => {
    if (isPlaced(session)) {
      const i = days.findIndex(
        (d) => d.key === pacificDayKey(session.startsAt),
      );
      if (i >= 0) setDayIndex(i);
    }
    openSession(session);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          {sessions.length > 0 &&
            ` (${published} published, ${sessions.length - published} draft)`}
          {" · "}
          {locations.length} {locations.length === 1 ? "room" : "rooms"}
          {error && <span className="ml-3 text-meeple">{error}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {canSeed && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(addSample)}
                className={smallButtonClass}
                title="Dev only: rooms and a weekend of sessions to look at."
              >
                Add sample data
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(clearSample)}
                className={smallButtonClass}
              >
                Remove sample data
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => openLocation(null)}
            className={smallButtonClass}
          >
            New room
          </button>
          <button
            type="button"
            onClick={() => openSession(null)}
            className={`${buttonClass} w-auto py-1.5 text-sm`}
          >
            New session
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {carrying && (
          <div
            role="status"
            className="sticky top-16 z-40 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-navy/30 bg-navy px-3 py-2 text-sm text-white shadow-md"
          >
            <span>
              Moving <span className="font-semibold">{carrying.title}</span>
              <span className="text-white/70">
                {" "}
                — click a slot to drop it, or press Esc to cancel.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setCarrying(null)}
              className="rounded border border-white/40 px-2 py-0.5 text-xs font-semibold hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex">
          <ScheduleSearch
            sessions={sessions}
            roomName={(s) => roomName(s.locationId)}
            onPick={jumpTo}
          />
        </div>
        <ScheduleGrid
          days={days}
          locations={locations}
          going={going}
          carrying={carrying}
          dayIndex={dayIndex}
          onDayChange={setDayIndex}
          onOpen={openSession}
          onCreate={createAt}
          onGrab={grab}
          onDrop={drop}
        />
      </div>

      {unplaced.length > 0 && (
        <Section title="Unplaced drafts">
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {unplaced.map((s) => (
              <li
                key={s.id}
                className={`flex items-stretch ${carrying?.id === s.id ? "bg-navy/[0.06]" : ""}`}
              >
                <GrabHandle
                  session={s}
                  carrying={carrying?.id === s.id}
                  onGrab={grab}
                  className="ml-2 w-6 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => openSession(s)}
                  className="flex min-w-0 flex-1 items-baseline justify-between gap-3 py-2.5 pr-4 pl-2 text-left text-sm transition-colors hover:bg-ink/[0.04]"
                >
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-ink/60">
                    {[roomName(s.locationId), hostNames(s)]
                      .filter(Boolean)
                      .join(" · ") || "no room, no hosts"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="All sessions">
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-ink/50 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Room</th>
                <th className="px-4 py-2 font-medium">Hosts</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className={s.status === "draft" ? "text-ink/60" : ""}
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    {isPlaced(s)
                      ? `${formatPacificDay(s.startsAt)} ${formatPacificTime(s.startsAt)}–${formatPacificTime(s.endsAt)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 font-semibold text-ink">
                    {s.title}
                  </td>
                  <td className="px-4 py-2">{roomName(s.locationId) ?? "—"}</td>
                  <td className="px-4 py-2">{hostNames(s) || "—"}</td>
                  <td className="px-4 py-2">
                    {s.status === "published" ? (
                      <span className="rounded bg-navy/10 px-1.5 py-0.5 text-xs font-semibold text-navy">
                        Published
                      </span>
                    ) : (
                      <span className="rounded bg-ink/10 px-1.5 py-0.5 text-xs font-semibold text-ink/60">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openSession(s)}
                      className={smallButtonClass}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                    No sessions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Rooms">
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-ink/50 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Campus</th>
                <th className="px-4 py-2 font-medium">Capacity</th>
                <th className="px-4 py-2 font-medium">Seen by</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {locations.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2 tabular-nums">{l.displayOrder}</td>
                  <td className="px-4 py-2 font-semibold">
                    <span className="flex items-center gap-2">
                      {l.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- already thumbnail-sized
                        <img
                          src={l.thumbnailUrl}
                          alt=""
                          className="h-8 w-10 rounded object-cover"
                        />
                      )}
                      {l.name}
                    </span>
                  </td>
                  <td className="px-4 py-2">{l.campusLocation ?? "—"}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {l.capacity ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {VISIBILITY_LABEL[l.visibility]}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openLocation(l)}
                      className={smallButtonClass}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {locations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                    No rooms yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {editing?.kind === "session" && (
        <SessionForm
          key={editing.session?.id ?? "new"}
          session={openNow}
          defaults={editing.defaults}
          locations={locations}
          attendance={openNow ? attendance[openNow.id] : undefined}
          viewer={viewer}
          onClose={close}
        />
      )}
      {editing?.kind === "location" && (
        <LocationForm
          key={editing.location?.id ?? "new"}
          location={editing.location}
          onClose={close}
        />
      )}
    </div>
  );
}
