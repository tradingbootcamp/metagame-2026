import { stripeMode, ticketTiers } from "@/lib/tickets";

export const FAMILY_PACK = {
  id: "family-friends",
  label: "Family & Friends Pack",
  usd: 375,
  min: 4,
  max: 6,
  // TODO(live): create the live Price before this ships; checkout is off until then.
  priceIds: {
    test: "price_1US939CtO443EG3nJQbU6ork",
    live: null,
  },
} as const;

export const familyPackPriceId: string | null =
  FAMILY_PACK.priceIds[stripeMode];

/** Regular Standard weekend price, shown struck through against the pack price. */
export const STANDARD_USD = ticketTiers.find((t) => t.id === "standard")!.prices
  .full.usd;

export type PackAttendee = { name: string; email: string };

export function parsePackAttendees(value: unknown): PackAttendee[] {
  if (
    !Array.isArray(value) ||
    value.length < FAMILY_PACK.min ||
    value.length > FAMILY_PACK.max
  ) {
    throw new Error("Choose 4–6 paid attendees.");
  }
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object")
      throw new Error("Enter each attendee's name and email.");
    const { name, email } = entry as Record<string, unknown>;
    if (typeof name !== "string" || typeof email !== "string")
      throw new Error("Enter each attendee's name and email.");
    const attendee = { name: name.trim(), email: email.trim() };
    if (
      !attendee.name ||
      attendee.name.length > 80 ||
      attendee.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)
    ) {
      throw new Error("Enter a valid name and email for each attendee.");
    }
    if (JSON.stringify(attendee).length > 500) {
      throw new Error("Shorten the attendee name or email.");
    }
    return attendee;
  });
}

export function packMetadata(attendees: PackAttendee[]) {
  return Object.fromEntries([
    ["tier", FAMILY_PACK.id],
    ["quantity", String(attendees.length)],
    ...attendees.map((attendee, index) => [
      `attendee_${index + 1}`,
      JSON.stringify(attendee),
    ]),
  ]);
}

export function attendeesFromMetadata(
  metadata: Record<string, string> | null,
): PackAttendee[] {
  const quantity = Number(metadata?.quantity);
  if (
    !Number.isInteger(quantity) ||
    quantity < FAMILY_PACK.min ||
    quantity > FAMILY_PACK.max
  )
    throw new Error("Invalid pack quantity.");
  return parsePackAttendees(
    Array.from({ length: quantity }, (_, index) =>
      JSON.parse(metadata?.[`attendee_${index + 1}`] ?? "null"),
    ),
  );
}

/** Split integer cents without losing rounding pennies across ticket rows. */
export function allocateCents(
  cents: number,
  count: number,
  index: number,
): number {
  return Math.floor(cents / count) + (index < cents % count ? 1 : 0);
}
