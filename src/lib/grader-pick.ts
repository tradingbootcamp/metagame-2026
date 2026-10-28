import { committeeLabel } from "./rfp-pipeline";
import {
  clearGraders,
  committeeAccounts,
  getRfpSession,
  reassignGrader,
  searchAccounts,
  type Account,
  type RfpSession,
} from "./rfp-sessions";

// What the Grader and Shepherd pickers share between /grade and the speaker
// committee board, so each page's server actions only add their own gate.

/** Accounts for a picker: the committee until two characters are typed. */
export async function pickerAccounts(query: string): Promise<Account[]> {
  const q = query.trim();
  return q.length < 2 ? committeeAccounts() : searchAccounts(q);
}

const names = (accounts: Account[]) => accounts.map(committeeLabel).join(", ");

/**
 * One pick over possibly several grade rows: `userId` becomes the session's
 * open assignment, or null clears them. Submitted grades are never thrown
 * away, so the grader shown afterwards can differ from the pick; the note
 * says why. `after` is the session as it now stands, null if it's gone.
 */
export async function pickGrader(
  sessionId: string,
  userId: string | null,
): Promise<{ after: RfpSession | null; note?: string }> {
  const { submitted } = userId
    ? await reassignGrader(sessionId, userId)
    : await clearGraders(sessionId);
  const after = await getRfpSession(sessionId);
  const others = submitted.filter((a) => a.userId !== userId);
  if (others.length === 0) return { after };
  const picked = userId
    ? after?.grades.find((g) => g.grader.userId === userId)?.grader
    : undefined;
  const pickedSubmitted = submitted.some((a) => a.userId === userId);
  const note = !picked
    ? `${names(others)} already graded this; only open assignments were cleared.`
    : pickedSubmitted
      ? `${names(others)} and ${committeeLabel(picked)} both already graded this.`
      : `${names(others)} already graded this; ${committeeLabel(picked)} was added as another grader.`;
  return { after, note };
}
