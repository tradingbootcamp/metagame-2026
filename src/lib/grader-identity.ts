// Who the /grade session says it is. Kept apart from grader-auth.ts, which
// reaches for node:crypto and next/headers: the sign-in form is a client
// component and needs these names without dragging the server half along.

/** Shown in the picker and the header for the un-named identity. */
export const SOMEONE_ELSE = "Someone else";

/**
 * "Someone else" has exactly the same access as a named grader — it only means
 * there's no name to match against the Grader and Shepherd columns, so
 * "Assigned to me" has nothing to filter on.
 */
export type Identity = { kind: "grader"; name: string } | { kind: "anon" };

export const identityLabel = (identity: Identity) =>
  identity.kind === "grader" ? identity.name : SOMEONE_ELSE;

/** The name to match rows against, or null for "Someone else". */
export const identityName = (identity: Identity) =>
  identity.kind === "grader" ? identity.name : null;
