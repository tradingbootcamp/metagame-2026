// Rail-agnostic half of the promo-code tool (/admin/promo): the deterministic
// code generator and the mint contract shared by the Stripe rail
// (promo-codes-stripe.ts) and the Bitcoin/Airtable rail (promo-codes-btc.ts).

export const PURPOSES = [
  "Speaker",
  "Volunteer",
  "Staff",
  "Sponsor",
  "Press",
  "Financial aid",
  "Friend/Family",
  "Easter Egg",
] as const;

export const PROMO_SOURCE = "comp-tool";

export type Rail = "stripe" | "btc";

export type MintInput = {
  name: string;
  email?: string;
  customCode?: string;
  /** null = unlimited; a positive integer = that cap; anything else = 1. */
  maxUses: number | null;
  purpose: string;
  notes?: string;
};

/** Who an existing code was originally issued to, so a re-run can say so. */
export type Prior = {
  name: string;
  email: string;
  purpose: string;
  created: number | null; // unix seconds
  redeemed?: number;
};

export type MintResult = {
  rail: Rail;
  code: string;
  name: string;
  email: string;
  reused: boolean;
  prior?: Prior;
  max: number | null;
  purpose: string;
  test: boolean;
};

export class PromoError extends Error {
  constructor(
    message: string,
    readonly code: "collision" | "exhausted" | "config",
  ) {
    super(message);
  }
}

export function normalizeName(name: string | undefined): string {
  const n = (name ?? "").trim();
  if (!n)
    throw new Error(
      "Enter a name (or pseudonym / group) for who this code is for",
    );
  return n;
}

export function normalizePurpose(purpose: string | undefined): string {
  const p = (purpose ?? "").trim();
  if (!p) throw new Error("Pick a purpose (or type a custom one)");
  return p;
}

/** Clamp to an integer cap ≥ 1; null stays null (unlimited). */
export function normalizeUses(
  maxUses: number | null | undefined,
): number | null {
  if (maxUses === null) return null;
  return Math.max(1, Math.floor(Number(maxUses) || 1));
}

export const SLUG_LEN = 5; // chars after "COMP-"
export const MAX_SLUG_ATTEMPTS = 10;

/**
 * Deterministic, human-typable code from a seed (email, else name). Stable per
 * (seed, attempt) so a re-run reproduces the same walk → idempotent. `attempt`
 * salts the hash: 0 is the primary code, 1… the fallbacks when the primary is
 * already taken by a different identity.
 */
export function slugCode(seed: string, attempt = 0): string {
  const base = seed.trim().toLowerCase() + (attempt ? `#${attempt}` : "");
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return (
    "COMP-" +
    (h % 36 ** SLUG_LEN).toString(36).toUpperCase().padStart(SLUG_LEN, "0")
  );
}

/** The identity a code was issued to — the same string slugCode() hashes. */
export const identityOf = ({
  email,
  name,
}: {
  email?: string | null;
  name?: string | null;
}) => (email || name || "").trim().toLowerCase();

export const seedOf = ({ email, name }: { email?: string; name: string }) =>
  (email || name).trim();

export const normalizeCustomCode = (code: string | undefined) =>
  (code ?? "").trim().toUpperCase();
