/** Only same-site paths survive, so a crafted ?next= can't bounce anyone off-site or back into /login. */
export function safeNextPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || /^\/[/\\]/.test(value)) return fallback;
  if (/[\r\n]/.test(value) || value.startsWith("/login")) return fallback;
  return value;
}
