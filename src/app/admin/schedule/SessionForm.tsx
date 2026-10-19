"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import { deleteSession, saveSession, type FormState } from "./actions";
import {
  buttonClass,
  fieldClass,
  selectClass,
  selectStyle,
  smallButtonClass,
} from "../ui";
import {
  AGES,
  CATEGORIES,
  CONFERENCE_DAYS,
  END_GAP_MINUTES,
  END_TIMES,
  START_TIMES,
  STATUSES,
  formatPacificDay,
  minutesToHHMM,
  pacificDayKey,
  pacificMinutes,
  slotLabel,
  type ScheduleLocation,
  type ScheduleSession,
} from "@/lib/schedule";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/v2/components/ui/dialog";

const LABELS = {
  talk: "Talk",
  workshop: "Workshop",
  game: "Game",
  other: "Other",
  all: "All ages",
  kids: "Kid-friendly",
  adults: "18+",
  draft: "Draft",
  published: "Published",
} as const;

function Field({
  label,
  name,
  state,
  children,
  className = "",
}: {
  label: string;
  name: string;
  state: FormState;
  children: React.ReactNode;
  className?: string;
}) {
  const error = state.field === name ? state.error : null;
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-ink/80">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-meeple">{error}</span>}
    </label>
  );
}

/** Prefill for a new session, e.g. from clicking an empty grid slot. */
export type SessionDefaults = {
  day: string;
  startMin: number;
  locationId: string | null;
};

const DEFAULT_START = 10 * 60;
const shortest = (start: number) => start + 30 - END_GAP_MINUTES;

/** Keeps an off-grid saved time selectable rather than silently changing it. */
const withCurrent = (options: number[], current: number | null) =>
  current === null || options.includes(current)
    ? options
    : [...options, current].sort((a, b) => a - b);

/** Create (no `session`) or edit a session, in a dialog on the cream admin page. */
export default function SessionForm({
  session,
  defaults,
  locations,
  onClose,
}: {
  session: ScheduleSession | null;
  defaults?: SessionDefaults;
  locations: ScheduleLocation[];
  onClose: () => void;
}) {
  const [day, setDay] = useState(
    session?.startsAt ? pacificDayKey(session.startsAt) : (defaults?.day ?? ""),
  );
  const [start, setStart] = useState<number | null>(
    session?.startsAt
      ? pacificMinutes(session.startsAt)
      : (defaults?.startMin ?? null),
  );
  const [end, setEnd] = useState<number | null>(
    session?.endsAt
      ? pacificMinutes(session.endsAt)
      : defaults
        ? shortest(defaults.startMin)
        : null,
  );

  const dayOptions: { key: string; label: string }[] = CONFERENCE_DAYS.map(
    (d) => ({ key: d.key, label: d.name }),
  );
  if (day && !dayOptions.some((d) => d.key === day) && session?.startsAt) {
    dayOptions.push({ key: day, label: formatPacificDay(session.startsAt) });
  }

  const pickDay = (key: string) => {
    setDay(key);
    if (key && start === null) {
      setStart(DEFAULT_START);
      setEnd(shortest(DEFAULT_START));
    }
  };

  // Moving the start keeps the duration, like a calendar drag.
  const pickStart = (next: number) => {
    const moved =
      start !== null && end !== null && end > start
        ? next + (end - start)
        : null;
    setStart(next);
    setEnd(
      moved !== null && moved <= END_TIMES.at(-1)! ? moved : shortest(next),
    );
  };

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveSession,
    {},
  );
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  const generalError =
    state.error && !state.field ? state.error : (deleteError ?? null);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] max-w-[720px] overflow-y-auto border-line bg-white px-6 py-6 text-ink sm:px-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-md text-ink/40 transition-colors hover:text-ink"
        >
          <XIcon className="size-[18px]" />
        </button>
        <DialogTitle className="font-bebas text-2xl tracking-wide text-navy">
          {session ? "Edit session" : "New session"}
        </DialogTitle>
        <DialogDescription className="mt-1 mb-5 text-sm text-ink/60">
          Times are Pacific. Pick “Not scheduled” to keep a draft unplaced.
        </DialogDescription>

        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          {session && <input type="hidden" name="id" value={session.id} />}

          <Field
            label="Title"
            name="title"
            state={state}
            className="sm:col-span-2"
          >
            <input
              name="title"
              required
              defaultValue={session?.title ?? ""}
              className={fieldClass}
              autoFocus
            />
          </Field>

          <Field label="Slug" name="slug" state={state}>
            <input
              name="slug"
              defaultValue={session?.slug ?? ""}
              placeholder="from the title if blank"
              className={`${fieldClass} font-mono text-sm`}
            />
          </Field>

          <Field label="Status" name="status" state={state}>
            <select
              name="status"
              defaultValue={session?.status ?? "draft"}
              className={selectClass}
              style={selectStyle}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LABELS[s]}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <Field label="Day" name="day" state={state}>
              <select
                value={day}
                onChange={(e) => pickDay(e.target.value)}
                className={selectClass}
                style={selectStyle}
              >
                <option value="">Not scheduled</option>
                {dayOptions.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Starts" name="startsAt" state={state}>
              <select
                value={start ?? ""}
                disabled={!day}
                onChange={(e) => pickStart(Number(e.target.value))}
                className={selectClass}
                style={selectStyle}
              >
                {withCurrent(START_TIMES, start).map((m) => (
                  <option key={m} value={m}>
                    {slotLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ends" name="endsAt" state={state}>
              <select
                value={end ?? ""}
                disabled={!day}
                onChange={(e) => setEnd(Number(e.target.value))}
                className={selectClass}
                style={selectStyle}
              >
                {withCurrent(
                  END_TIMES.filter((m) => start === null || m > start),
                  end,
                ).map((m) => (
                  <option key={m} value={m}>
                    {slotLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
            <input
              type="hidden"
              name="startsAt"
              value={
                day && start !== null ? `${day}T${minutesToHHMM(start)}` : ""
              }
            />
            <input
              type="hidden"
              name="endsAt"
              value={day && end !== null ? `${day}T${minutesToHHMM(end)}` : ""}
            />
          </div>

          <Field label="Room" name="locationId" state={state}>
            <select
              name="locationId"
              defaultValue={session?.locationId ?? defaults?.locationId ?? ""}
              className={selectClass}
              style={selectStyle}
            >
              <option value="">No room yet</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.capacity ? ` (${l.capacity})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category" name="category" state={state}>
            <select
              name="category"
              defaultValue={session?.category ?? ""}
              className={selectClass}
              style={selectStyle}
            >
              <option value="">Unset</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {LABELS[c]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ages" name="ages" state={state}>
            <select
              name="ages"
              defaultValue={session?.ages ?? ""}
              className={selectClass}
              style={selectStyle}
            >
              <option value="">Unset</option>
              {AGES.map((a) => (
                <option key={a} value={a}>
                  {LABELS[a]}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min capacity" name="minCapacity" state={state}>
              <input
                name="minCapacity"
                inputMode="numeric"
                defaultValue={session?.minCapacity ?? ""}
                className={fieldClass}
              />
            </Field>
            <Field label="Max capacity" name="maxCapacity" state={state}>
              <input
                name="maxCapacity"
                inputMode="numeric"
                defaultValue={session?.maxCapacity ?? ""}
                placeholder="unlimited"
                className={fieldClass}
              />
            </Field>
          </div>

          <Field
            label="Hosts, one per line (lead first)"
            name="hosts"
            state={state}
            className="sm:col-span-2"
          >
            <textarea
              name="hosts"
              rows={2}
              defaultValue={session?.hosts.join("\n") ?? ""}
              className={fieldClass}
            />
          </Field>

          <Field
            label="Description"
            name="description"
            state={state}
            className="sm:col-span-2"
          >
            <textarea
              name="description"
              rows={4}
              defaultValue={session?.description ?? ""}
              className={fieldClass}
            />
          </Field>

          <Field
            label="Needs (A/V, tables, materials…)"
            name="needs"
            state={state}
            className="sm:col-span-2"
          >
            <textarea
              name="needs"
              rows={2}
              defaultValue={session?.needs ?? ""}
              className={fieldClass}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              {session &&
                (confirmDelete ? (
                  <>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() =>
                        startDelete(async () => {
                          const result = await deleteSession(session.id);
                          if (result.error) setDeleteError(result.error);
                          else onClose();
                        })
                      }
                      className={`${smallButtonClass} border-meeple text-meeple hover:bg-meeple hover:text-white`}
                    >
                      {deleting ? "Deleting…" : "Yes, delete it"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className={smallButtonClass}
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className={`${smallButtonClass} hover:border-meeple hover:text-meeple`}
                  >
                    Delete
                  </button>
                ))}
              {generalError && (
                <span className="text-sm text-meeple">{generalError}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={smallButtonClass}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className={`${buttonClass} w-auto`}
              >
                {pending ? "Saving…" : session ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
