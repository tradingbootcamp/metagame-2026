import { createHash } from "node:crypto";

// Crockford-style: no I/L/O/U, so codes survive being read aloud or retyped.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Deterministic 6-char ticket code derived from the payment id (Stripe
 * PaymentIntent or OpenNode charge id) — same input always yields the same
 * code, so webhook retries/upserts can never churn a code. Codes are
 * per-admission: single purchases use the payment id; group purchases append
 * a stable ticket index so each attendee has a separate code.
 */
export function ticketCode(paymentId: string): string {
  const hash = createHash("sha256").update(paymentId).digest();
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[hash[i] % ALPHABET.length];
  }
  return code;
}

/** Display form: "A2C4EF" → "A2C-4EF". Stored dashless. */
export function formatTicketCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}
