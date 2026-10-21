import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  FaMapMarkerAlt,
  FaRegClock,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";
import { adminAccess } from "@/lib/admin-auth";
import { airtableConfig } from "@/lib/airtable-config";
import { currentSession } from "@/lib/auth";
import { getSubmission, SCHEDULER_NOTES_FIELD } from "@/lib/rfp-rubric";
import {
  formatPacificDay,
  formatPacificTime,
  hostNames,
  type Ages,
  type Category,
  type SessionRsvps,
} from "@/lib/schedule";
import { loadSessionRsvps, loadViewerPlans } from "@/lib/schedule-store";
import PlanButtons from "@/v2/components/schedule/PlanButtons";
import { blockStyle } from "@/v2/components/schedule/SessionBits";
import { HEADING } from "@/v2/components/styles";
import { loadPublicSchedule, loadRawSchedule, prelaunchGate } from "../data";

type Props = { params: Promise<{ slug: string }> };

const CATEGORY_LABEL: Record<Category, string> = {
  talk: "Talk",
  workshop: "Workshop",
  game: "Game",
  other: "Other",
};

const AGES_LABEL: Record<Ages, string> = {
  all: "All ages",
  kids: "Kid-friendly",
  adults: "18+",
};

async function findSession(slug: string) {
  const { sessions, locations } = await loadPublicSchedule();
  const session = sessions.find((s) => s.slug === slug);
  if (!session) notFound();
  const room = locations.find((l) => l.id === session.locationId) ?? null;
  return { session, room };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await prelaunchGate();
  const { session } = await findSession((await params).slug);
  return {
    title: `${session.title} — Metagame 2026`,
    robots: { index: false },
  };
}

function Attendees({ rsvps }: { rsvps: SessionRsvps }) {
  const counts = [
    `${rsvps.going} going`,
    rsvps.waitlist > 0 ? `${rsvps.waitlist} waitlisted` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  if (!rsvps.names) return <p className="text-[15px]">{counts}</p>;
  const list = (title: string, names: string[]) =>
    names.length > 0 && (
      <div>
        <p className="mb-1 text-xs tracking-[0.12em] text-[#1b1530]/55 uppercase">
          {title}
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[15px]">
          {names.map((name, i) => (
            <li key={i}>{name}</li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px]">{counts}</p>
      {list("Going", rsvps.names.going)}
      {list("Waitlist", rsvps.names.waitlist)}
    </div>
  );
}

async function schedulerNotes(recordId: string) {
  try {
    const submission = await getSubmission(recordId);
    if (!submission) return { ok: false as const };
    const notes = submission.fields[SCHEDULER_NOTES_FIELD];
    return {
      ok: true as const,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    };
  } catch (err) {
    console.error("Airtable RFP fetch failed", recordId, err);
    return { ok: false as const };
  }
}

function AdminNote({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="mb-1 text-xs tracking-[0.12em] text-[#1b1530]/55 uppercase">
        {title}
      </p>
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-[#1b1530]/85">
        {text}
      </p>
    </div>
  );
}

async function AdminDetails({ sessionId }: { sessionId: string }) {
  const { sessions } = await loadRawSchedule();
  const raw = sessions.find((s) => s.id === sessionId);
  const recordId = raw?.airtableRfpRecordId ?? null;
  const needs = raw?.needs?.trim() || null;
  const airtable = recordId ? await schedulerNotes(recordId) : null;
  const link = "font-semibold text-navy underline";

  return (
    <section className="mt-10 flex flex-col gap-4 border-t border-dashed border-line pt-6">
      <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-[0.04em] text-[#1b1530]/55">
        Admin only
      </h2>
      {recordId ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Link href={`/grade/${recordId}`} target="_blank" className={link}>
            Grading page
          </Link>
          <a
            href={`https://airtable.com/${airtableConfig.baseId}/${airtableConfig.rfpSubmissionsTableId}/${recordId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={link}
          >
            Airtable record
          </a>
        </div>
      ) : (
        <p className="text-sm text-[#1b1530]/60">No RFP linked</p>
      )}
      {airtable && !airtable.ok && (
        <p className="text-sm text-[#1b1530]/60">
          Couldn&rsquo;t load Airtable record
        </p>
      )}
      {airtable?.ok && airtable.notes && (
        <AdminNote title="Grader notes for scheduler" text={airtable.notes} />
      )}
      {needs && <AdminNote title="Needs" text={needs} />}
    </section>
  );
}

export default async function SessionPage({ params }: Props) {
  await prelaunchGate();
  const { slug } = await params;
  const [{ session, room }, account, admin] = await Promise.all([
    findSession(slug),
    currentSession(),
    adminAccess(),
  ]);
  const viewerId = account?.user.id ?? null;
  const [rsvps, plans] = await Promise.all([
    loadSessionRsvps(session.id, viewerId),
    viewerId ? loadViewerPlans(viewerId) : null,
  ]);

  const tags = [
    session.category ? CATEGORY_LABEL[session.category] : null,
    session.ages ? AGES_LABEL[session.ages] : null,
  ].filter(Boolean) as string[];
  const cap = session.maxCapacity;

  return (
    <div className="mx-auto max-w-[820px] px-8 pt-28 pb-20 text-[#1b1530]">
      <Link
        href="/schedule"
        className="text-sm text-[#1b1530]/60 hover:text-navy"
      >
        ← Schedule
      </Link>

      <span
        aria-hidden
        className="mt-6 block h-2 w-16 rounded-full border"
        style={blockStyle(session)}
      />
      <h1 className={`${HEADING} mt-4 text-[clamp(30px,5vw,48px)] text-navy`}>
        {session.title}
      </h1>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
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

      <dl className="mt-6 flex flex-col gap-2.5 text-[15px]">
        <div className="flex items-center gap-2.5">
          <dt className="sr-only">When</dt>
          <FaRegClock aria-hidden className="shrink-0 text-[#eaa35a]" />
          <dd>
            {formatPacificDay(session.startsAt)},{" "}
            {formatPacificTime(session.startsAt)}–
            {formatPacificTime(session.endsAt)} PT
          </dd>
        </div>
        <div className="flex items-center gap-2.5">
          <dt className="sr-only">Where</dt>
          <FaMapMarkerAlt aria-hidden className="shrink-0 text-[#eaa35a]" />
          <dd className="flex items-center gap-2.5">
            {room?.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- already thumbnail-sized
              <img
                src={room.thumbnailUrl}
                alt=""
                className="h-10 w-14 rounded-sm object-cover"
              />
            )}
            <span>
              {room?.name ?? "Room TBA"}
              {room?.campusLocation && (
                <span className="text-[#1b1530]/60">
                  {" "}
                  · {room.campusLocation}
                </span>
              )}
            </span>
          </dd>
        </div>
        {session.hosts.length > 0 && (
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">Hosts</dt>
            <FaUserFriends aria-hidden className="shrink-0 text-[#eaa35a]" />
            <dd>{hostNames(session)}</dd>
          </div>
        )}
        {cap !== null && (
          <div className="flex items-center gap-2.5">
            <dt className="sr-only">Capacity</dt>
            <FaUsers aria-hidden className="shrink-0 text-[#eaa35a]" />
            <dd>Up to {cap}</dd>
          </div>
        )}
      </dl>

      {session.description && (
        <p className="mt-6 text-[15px] leading-relaxed whitespace-pre-line text-[#1b1530]/85">
          {session.description}
        </p>
      )}

      <section className="mt-10 flex flex-col gap-4 border-t border-line pt-6">
        <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-[0.04em] text-navy">
          Who&rsquo;s coming
        </h2>
        {plans ? (
          <PlanButtons
            sessionId={session.id}
            status={plans.rsvps[session.id] ?? null}
            bookmarked={plans.bookmarks.includes(session.id)}
            full={cap !== null && rsvps.going >= cap}
          />
        ) : (
          <p className="text-sm text-[#1b1530]/60">
            <Link
              href={`/login?next=${encodeURIComponent(`/schedule/${slug}`)}`}
              className="font-semibold text-navy underline"
            >
              Sign in
            </Link>{" "}
            to RSVP or bookmark.
          </p>
        )}
        <Attendees rsvps={rsvps} />
        {plans && !rsvps.names && (
          <p className="text-sm text-[#1b1530]/60">
            Claim your ticket to see who&rsquo;s coming.
          </p>
        )}
      </section>

      {admin && (
        <Suspense>
          <AdminDetails sessionId={session.id} />
        </Suspense>
      )}
    </div>
  );
}
