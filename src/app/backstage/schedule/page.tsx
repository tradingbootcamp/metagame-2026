import { connection } from "next/server";
import SignIn from "../SignIn";
import ScheduleTool from "./ScheduleTool";
import { toolAccess } from "@/lib/admin-auth";
import { can } from "@/lib/access";
import {
  loadAttendance,
  loadSchedule,
  loadViewerPlans,
} from "@/lib/schedule-store";
import type { Attendance } from "@/lib/schedule";

/** The same attendance with every name and email dropped. */
const countsOnly = (attendance: Attendance): Attendance =>
  Object.fromEntries(
    Object.entries(attendance).map(([id, a]) => [
      id,
      {
        ...a,
        attendees: a.attendees.map((x) => ({ ...x, name: "", email: "" })),
      },
    ]),
  );

export default async function AdminSchedulePage(
  props: PageProps<"/backstage/schedule">,
) {
  // Per-request on every branch, or the sign-in branch gets baked in as
  // static at build time.
  await connection();

  const access = await toolAccess("schedule.view");
  if (!access) return <SignIn next="/backstage/schedule" />;

  const { edit } = await props.searchParams;
  const [schedule, attendance, plans, canEdit, canReorder, seesRsvps] =
    await Promise.all([
      loadSchedule(),
      loadAttendance(),
      loadViewerPlans(access.userId),
      can("schedule.manage").then(Boolean),
      can("schedule.rooms").then(Boolean),
      can("schedule.rsvps").then(Boolean),
    ]);
  const viewer = { ...plans, userId: access.userId };
  // Mirrors the guard in actions.ts: sample data only against a local database.
  const canSeed = canEdit && process.env.NODE_ENV === "development";
  return (
    <ScheduleTool
      {...schedule}
      // schedule.view alone is "not RSVP lists": the grid still gets its counts.
      attendance={canEdit || seesRsvps ? attendance : countsOnly(attendance)}
      viewer={viewer}
      canEdit={canEdit}
      canSeed={canSeed}
      canReorder={canReorder}
      initialEdit={typeof edit === "string" ? edit : null}
    />
  );
}
