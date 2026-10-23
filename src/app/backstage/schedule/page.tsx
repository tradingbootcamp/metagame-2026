import { connection } from "next/server";
import SignIn from "../SignIn";
import { NameForm } from "../SignInForms";
import ScheduleTool from "./ScheduleTool";
import { toolAccess } from "@/lib/admin-auth";
import {
  loadAttendance,
  loadSchedule,
  loadViewerPlans,
} from "@/lib/schedule-store";

export default async function AdminSchedulePage() {
  // Per-request on every branch, or the sign-in branch gets baked in as
  // static at build time.
  await connection();

  const access = await toolAccess("schedule.manage");
  if (!access) return <SignIn next="/backstage/schedule" />;
  if (!access.name) return <NameForm />;

  const [schedule, attendance, plans] = await Promise.all([
    loadSchedule(),
    loadAttendance(),
    access.via === "account" ? loadViewerPlans(access.userId) : null,
  ]);
  const viewer =
    access.via === "account" && plans
      ? { ...plans, userId: access.userId }
      : null;
  // Mirrors the guard in actions.ts: sample data only against a local database.
  const canSeed = process.env.NODE_ENV === "development";
  return (
    <ScheduleTool
      {...schedule}
      attendance={attendance}
      viewer={viewer}
      canSeed={canSeed}
    />
  );
}
