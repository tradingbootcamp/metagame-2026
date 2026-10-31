// Pure megagame rules: code and answer matching, level derivation, soft
// checks, and the dashboard's bucket math. No database or Next imports, so
// client components can use it. Class list and level maximum come from
// megagame-levels.ts.

import { TICKET_CODE_LENGTH, normalizeTicketCode } from "./ticket-code-format";

/** A quest or badge code as typed, scanned, or pasted as a /q/<code> URL. */
export function normalizeMegagameCode(input: string): string {
  let text = input.trim();
  const cut = text.search(/[?#]/);
  if (cut !== -1) text = text.slice(0, cut);
  text = text.replace(/\/+$/, "");
  if (text.includes("/")) text = text.slice(text.lastIndexOf("/") + 1);
  return normalizeTicketCode(text);
}

/** Whether a normalized code is a full code, which is what a lookup needs. */
export function isCompleteMegagameCode(code: string): boolean {
  return code.length === TICKET_CODE_LENGTH;
}

/** Case, accents, punctuation and whitespace do not matter. */
export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export type AnswerMatch = { matched: boolean; answer: string | null };

/** `answer` is the accepted answer as stored, for showing the volunteer what matched. */
export function matchAnswer(
  entered: string,
  accepted: readonly string[],
): AnswerMatch {
  const wanted = normalizeAnswer(entered);
  if (wanted === "") return { matched: false, answer: null };
  for (const candidate of accepted) {
    if (normalizeAnswer(candidate) === wanted) {
      return { matched: true, answer: candidate };
    }
  }
  return { matched: false, answer: null };
}
