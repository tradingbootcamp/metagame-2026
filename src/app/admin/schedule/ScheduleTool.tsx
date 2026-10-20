"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { addSample, clearSample, type FormState } from "./actions";
import LocationForm from "./LocationForm";
import ScheduleGrid from "./ScheduleGrid";
import SessionForm, { type SessionDefaults } from "./SessionForm";
import { buttonClass, smallButtonClass } from "../ui";
import {
  buildDays,
  formatPacificDay,
  formatPacificTime,
  hostNames,
  isPlaced,
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

export default function ScheduleTool({
  sessions,
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => setEditing(null), []);

  const days = useMemo(() => buildDays(sessions), [sessions]);
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

  const openSession = (session: ScheduleSession | null) =>
    setEditing({ kind: "session", session });
  const createAt = (defaults: SessionDefaults) =>
    setEditing({ kind: "session", session: null, defaults });
  const openLocation = (location: ScheduleLocation | null) =>
    setEditing({ kind: "location", location });

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

      <ScheduleGrid
        days={days}
        locations={locations}
        going={going}
        onOpen={openSession}
        onCreate={createAt}
      />

      {unplaced.length > 0 && (
        <Section title="Unplaced drafts">
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {unplaced.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => openSession(s)}
                  className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.04]"
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
                <th className="px-4 py-2 font-medium">Public</th>
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
                    {l.showInSchedule ? "Shown" : "Hidden"}
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
