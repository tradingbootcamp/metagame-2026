// Client-safe half of ticket-code.ts (that one pulls in node:crypto).

export const TICKET_CODE_LENGTH = 6;

/** Display form: "A2C4EF" → "A2C-4EF". Stored dashless. */
export function formatTicketCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * Typed codes: case, dashes and spaces don't matter; I/L read as 1, O as 0,
 * U as V. The alphabet has none of I/L/O/U.
 */
export function normalizeTicketCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .replace(/U/g, "V");
}
