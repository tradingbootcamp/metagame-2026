"use server";

import { revalidatePath } from "next/cache";
import type { DeskAccount } from "./desk";
import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { formatBadgeCode } from "@/lib/badge-code";
import { CHECKIN_QUERY_MAX, parseBadgeInput } from "@/lib/checkin";
import { badgeWearer, searchCheckinAccounts } from "@/lib/checkin-store";
import { reportError } from "@/lib/error-report";
import {
  assignBadgeCode,
  checkInTicket,
  claimTicketFor,
  undoCheckIn,
} from "@/lib/ticket-store";

const TOOL = "/backstage/checkin";

const str = (formData: FormData, key: string, max = 500) =>
  String(formData.get(key) ?? "")
    .trim()
    .slice(0, max);

const manage = () => requireAccess("checkin.manage");

export type DeskState = { error?: string; done?: string };

const CLAIM_ERRORS = {
  unknown: "That ticket no longer exists. Search again.",
  yours: "They already have this ticket.",
  already: "That account already has a ticket, so it can't take another.",
  taken: "Someone else claimed this ticket in the meantime. Search again.",
  unpaid: "That ticket hasn't been paid for.",
  void: "That ticket's payment didn't go through.",
  checkedIn: "That ticket is already checked in.",
  limited: "Too many attempts. Try again in an hour.",
};

export async function claimFor(
  _prev: DeskState,
  formData: FormData,
): Promise<DeskState> {
  const access = await manage();
  if (!access) return { error: EXPIRED };
  const paymentId = str(formData, "paymentId");
  const forUserId = str(formData, "forUserId");
  if (!paymentId || !forUserId) return { error: "Pick an account first." };
  const result = await claimTicketFor(access.userId, paymentId, forUserId);
  if (!result.ok) return { error: CLAIM_ERRORS[result.reason] };
  revalidatePath(TOOL);
  return { done: "Claimed" };
}

async function takenMessage(code: number): Promise<string> {
  const wearer = await badgeWearer(code);
  return `Badge ${formatBadgeCode(code)} is already on ${wearer ?? "another ticket"}.`;
}

/** Saves the badge number, and with intent=checkin also checks the ticket in. */
export async function badgeAction(
  _prev: DeskState,
  formData: FormData,
): Promise<DeskState> {
  const access = await manage();
  if (!access) return { error: EXPIRED };
  const paymentId = str(formData, "paymentId");
  const checkingIn = str(formData, "intent") === "checkin";
  const badge = parseBadgeInput(str(formData, "badge", 20));
  if (badge === undefined) {
    return { error: "Badge numbers are up to four digits." };
  }
  if (checkingIn && badge === null) {
    return { error: "Type the badge number before checking in." };
  }

  const assigned = await assignBadgeCode(paymentId, badge);
  if (!assigned.ok) {
    if (assigned.reason === "taken" && badge !== null)
      return { error: await takenMessage(badge) };
    if (assigned.reason === "invalid")
      return { error: "Badge numbers are up to four digits." };
    return { error: CLAIM_ERRORS.unknown };
  }
  if (!checkingIn) {
    revalidatePath(TOOL);
    return { done: badge === null ? "Badge removed" : "Badge saved" };
  }

  const result = await checkInTicket(access.userId, paymentId);
  revalidatePath(TOOL);
  if (result.ok) return { done: "Checked in" };
  if (result.reason === "already") return { done: "Already checked in" };
  if (result.reason === "unclaimed")
    return { error: "Claim the ticket for them first." };
  if (result.reason === "unpaid") return { error: CLAIM_ERRORS.unpaid };
  return { error: CLAIM_ERRORS.unknown };
}

export async function undoAction(
  _prev: DeskState,
  formData: FormData,
): Promise<DeskState> {
  if (!(await manage())) return { error: EXPIRED };
  const ticket = await undoCheckIn(str(formData, "paymentId"));
  revalidatePath(TOOL);
  if (!ticket) return { error: "That ticket wasn't checked in." };
  return { done: "Undone" };
}

export async function findAccounts(
  query: string,
): Promise<{ accounts?: DeskAccount[]; error?: string }> {
  if (!(await manage())) return { error: EXPIRED };
  return {
    accounts: await searchCheckinAccounts(String(query).slice(0, 100)),
  };
}

export async function reportProblem(
  _prev: DeskState,
  formData: FormData,
): Promise<DeskState> {
  const access = await manage();
  if (!access) return { error: EXPIRED };
  const text = str(formData, "text", 1200);
  if (!text) return { error: "Say what's wrong first." };
  await reportError({
    source: "Check-in desk",
    summary: text,
    details: {
      Volunteer: access.name,
      Search: str(formData, "q", CHECKIN_QUERY_MAX),
      Ticket: str(formData, "paymentId"),
    },
  });
  return { done: "Sent to Brian and Sparr." };
}
