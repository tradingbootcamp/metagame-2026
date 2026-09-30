import { createSessionAuth, type Session as BaseSession } from "./session-auth";

// Team-only tools under /admin. Same shared-password + self-asserted-name model
// as /grade; the name only labels what you create.

export type AdminIdentity = { name: string };
export type Session = BaseSession<AdminIdentity>;

function parseIdentity(value: unknown): AdminIdentity | null {
  if (!value || typeof value !== "object") return null;
  const { name } = value as { name?: unknown };
  return typeof name === "string" && name.trim() ? { name } : null;
}

export const {
  isConfigured,
  checkPassword,
  startSession,
  endSession,
  readSession,
} = createSessionAuth<AdminIdentity>({
  cookie: "mg_admin",
  path: "/admin",
  passwordEnv: "ADMIN_PASSWORD",
  secretEnv: "ADMIN_SESSION_SECRET",
  parseIdentity,
});
