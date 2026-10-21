import { emailKey } from "@/lib/ticket-holder";

/** A checkout's Discord field as we store it. Buyers often type "@name"; Discord usernames can't contain "@". */
export function cleanDiscordHandle(raw: string | null | undefined) {
  return raw?.trim().replace(/^@+\s*/, "") || undefined;
}

/**
 * The profile's Discord handle, or when it's empty the one typed at checkout
 * for the newest ticket bought under this email that has one. Only the buyer's
 * own tickets count: a holder or owner may be someone else.
 */
export function prefillDiscord(
  profileHandle: string | null | undefined,
  tickets: {
    purchaserEmail: string | null;
    purchaserDiscord: string | null;
    createdAt: Date;
  }[],
  email: string,
): string {
  if (profileHandle?.trim()) return profileHandle;
  const key = emailKey(email);
  return (
    tickets
      .filter((t) => t.purchaserEmail === key && t.purchaserDiscord)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      ?.purchaserDiscord ?? ""
  );
}
