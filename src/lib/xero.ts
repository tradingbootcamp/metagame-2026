import "server-only";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { env } from "@/env";
import { getDb, schema } from "@/db";

// Xero OAuth2 for the budget tool. The app holds one connection (row id
// "metagame"). Access tokens last 30 minutes; the refresh token is single-use
// and rotates on every refresh, so the pair lives in Postgres and refreshing
// takes a short lease on the row so two functions can't burn the same token.

const { xeroConnections } = schema;

export const CONNECTION_ID = "metagame";
/** Carries the OAuth state between the connect and callback routes. */
export const STATE_COOKIE = "mg_xero_state";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const API = "https://api.xero.com/api.xro/2.0/";
const LEASE_SECONDS = 30;

// Granular scopes: this app rejects the umbrella accounting.transactions.*.
export const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "accounting.banktransactions.read",
  "accounting.manualjournals.read",
  "accounting.settings.read",
  "accounting.contacts.read",
].join(" ");

export type XeroTenant = { tenantId: string; tenantName: string };

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export const xeroConfigured = (): boolean =>
  Boolean(env.XERO_CLIENT_ID && env.XERO_CLIENT_SECRET);

function clientCredentials(): { id: string; secret: string } {
  const { XERO_CLIENT_ID: id, XERO_CLIENT_SECRET: secret } = env;
  if (!id || !secret) throw new Error("XERO_CLIENT_ID / SECRET not set.");
  return { id, secret };
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const { id } = clientCredentials();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: id,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

async function tokenRequest(
  form: Record<string, string>,
): Promise<TokenResponse> {
  const { id, secret } = clientCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  });
  if (!res.ok)
    throw new Error(`Xero token request failed: ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

const expiresAt = (tokens: TokenResponse) =>
  new Date(Date.now() + (tokens.expires_in - 60) * 1000);

export async function listTenants(accessToken: string): Promise<XeroTenant[]> {
  const res = await fetch(CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Xero connections: ${await res.text()}`);
  return (await res.json()) as XeroTenant[];
}

/** The one-time consent callback: swaps the code and stores the connection. */
export async function connect(
  code: string,
  redirectUri: string,
  connectedBy: string,
): Promise<XeroTenant> {
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const tenants = await listTenants(tokens.access_token);
  if (tenants.length === 0) throw new Error("Xero returned no organisation.");
  const tenant =
    tenants.find((t) => /metagame|arbor/i.test(t.tenantName)) ?? tenants[0];
  const row = {
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessExpiresAt: expiresAt(tokens),
    refreshLockedAt: null,
    connectedBy,
  };
  await getDb()
    .insert(xeroConnections)
    .values({ id: CONNECTION_ID, ...row })
    .onConflictDoUpdate({ target: xeroConnections.id, set: row });
  return tenant;
}

export type XeroStatus = {
  connected: boolean;
  tenantName: string | null;
  connectedBy: string | null;
  updatedAt: Date | null;
};

export async function xeroStatus(): Promise<XeroStatus> {
  const [row] = await getDb()
    .select({
      tenantName: xeroConnections.tenantName,
      connectedBy: xeroConnections.connectedBy,
      updatedAt: xeroConnections.updatedAt,
    })
    .from(xeroConnections)
    .where(eq(xeroConnections.id, CONNECTION_ID));
  return row
    ? { connected: true, ...row }
    : {
        connected: false,
        tenantName: null,
        connectedBy: null,
        updatedAt: null,
      };
}

type Connection = typeof xeroConnections.$inferSelect;

async function readConnection(): Promise<Connection> {
  const [row] = await getDb()
    .select()
    .from(xeroConnections)
    .where(eq(xeroConnections.id, CONNECTION_ID));
  if (!row) throw new Error("Xero isn't connected yet.");
  return row;
}

const fresh = (row: Connection) =>
  row.accessExpiresAt.getTime() > Date.now() + 30_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A usable access token, refreshing under a lease when stale. A caller that
 * loses the lease waits for the holder's write instead of refreshing too.
 */
export async function accessToken(force = false): Promise<Connection> {
  const db = getDb();
  let row = await readConnection();
  if (!force && fresh(row)) return row;

  for (let attempt = 0; attempt < 20; attempt++) {
    const [leased] = await db
      .update(xeroConnections)
      .set({ refreshLockedAt: sql`now()` })
      .where(
        and(
          eq(xeroConnections.id, CONNECTION_ID),
          or(
            isNull(xeroConnections.refreshLockedAt),
            lt(
              xeroConnections.refreshLockedAt,
              sql`now() - make_interval(secs => ${LEASE_SECONDS})`,
            ),
          ),
        ),
      )
      .returning();
    if (leased) {
      // Someone may have refreshed between our read and the lease.
      if (!force && fresh(leased)) {
        await db
          .update(xeroConnections)
          .set({ refreshLockedAt: null })
          .where(eq(xeroConnections.id, CONNECTION_ID));
        return leased;
      }
      try {
        const tokens = await tokenRequest({
          grant_type: "refresh_token",
          refresh_token: leased.refreshToken,
        });
        const [updated] = await db
          .update(xeroConnections)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            accessExpiresAt: expiresAt(tokens),
            refreshLockedAt: null,
          })
          .where(eq(xeroConnections.id, CONNECTION_ID))
          .returning();
        return updated;
      } catch (err) {
        await db
          .update(xeroConnections)
          .set({ refreshLockedAt: null })
          .where(eq(xeroConnections.id, CONNECTION_ID));
        throw err;
      }
    }
    await sleep(500);
    row = await readConnection();
    if (fresh(row)) return row;
  }
  throw new Error("Timed out waiting for the Xero token refresh.");
}

/** GET from the accounting API; one retry through a forced refresh on 401. */
export async function xeroGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(path.replace(/^\//, ""), API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let conn = await accessToken();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        "xero-tenant-id": conn.tenantId,
        Accept: "application/json",
      },
    });
    if (res.status === 401 && attempt === 0) {
      conn = await accessToken(true);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Xero GET ${path}: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as T;
  }
}

/** For the weekly cron: a refresh keeps the 60-day refresh token alive. */
export async function keepAlive(): Promise<XeroStatus> {
  await accessToken(true);
  return xeroStatus();
}
