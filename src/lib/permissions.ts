// The permission catalog and the pure resolution over it. One entry per gate
// the code enforces; the roles and per-user grants that hold them live in
// Postgres (src/db/schema/permissions.ts) and are read by src/lib/access.ts.
// Adding a gate means adding its key here, nothing else. Keys with no gate
// yet wait for their page: checkin.manage lands with the check-in page.

export const PERMISSIONS = {
  "users.view": {
    label: "Users",
    description: "Browse accounts and see each one's roles and permissions.",
  },
  "users.edit": {
    label: "Users: edit access",
    description: "Assign roles and per-user permissions to other accounts.",
    implies: ["users.view"],
  },
  "users.delete": {
    label: "Users: delete",
    description:
      "Permanently delete non-admin accounts. Admin, ban and admin deletion stay admin-only.",
    implies: ["users.view"],
  },
  "roles.manage": {
    label: "Roles",
    description: "Create roles and change which permissions each carries.",
  },
  "tickets.view": {
    label: "Tickets",
    description: "See every ticket with its buyer, holder and attendee.",
  },
  "schedule.manage": {
    label: "Schedule",
    description: "Edit rooms and sessions, on the admin grid and over the API.",
    implies: ["schedule.preview"],
  },
  "schedule.preview": {
    label: "Schedule preview",
    description: "See the public schedule before launch.",
  },
  "promo.manage": {
    label: "Promo codes",
    description: "Mint and disable comp and discount codes.",
  },
  "links.manage": {
    label: "Tracking links",
    description: "Make short /go/ links.",
  },
  "api_keys.manage": {
    label: "API keys",
    description: "Mint and revoke API keys for any account.",
  },
  // Not enforced yet: the /account flow is META-4540.
  "api_keys.self": {
    label: "Own API keys",
    description: "Mint and revoke API keys for your own account.",
  },
  "schema.view": {
    label: "Database schema",
    description: "See the database schema.",
  },
  "submissions.grade": {
    label: "Session grading",
    description: "The speaker committee's rubric at /grade.",
  },
} as const satisfies Record<
  string,
  { label: string; description: string; implies?: readonly string[] }
>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

export const isPermission = (value: unknown): value is Permission =>
  typeof value === "string" && Object.hasOwn(PERMISSIONS, value);

/** What a shared-password session may do: the tools the password reached before accounts. */
export const ADMIN_PASSWORD_PERMISSIONS: readonly Permission[] = [
  "schedule.manage",
  "promo.manage",
  "links.manage",
  "schema.view",
];

export type AccessInput = {
  /** Better Auth `user.role = 'admin'`: holds everything. */
  admin: boolean;
  roles: readonly { name: string; permissions: readonly string[] }[];
  /** Per-user grants on top of the roles. */
  grants: readonly string[];
};

/** Why an account holds a permission, in precedence order. */
export type Source =
  | { kind: "admin" }
  | { kind: "grant" }
  | { kind: "role"; role: string }
  | { kind: "implied"; by: Permission };

export type Explanation = {
  effective: boolean;
  /** The first source is the deciding one; the rest would also apply. */
  sources: Source[];
};

/** Closes a set over `implies`. Unknown keys (a removed permission) drop out. */
export function expand(permissions: Iterable<string>): Set<Permission> {
  const out = new Set<Permission>();
  const visit = (p: string) => {
    if (!isPermission(p) || out.has(p)) return;
    out.add(p);
    for (const q of implied(p)) visit(q);
  };
  for (const p of permissions) visit(p);
  return out;
}

const implied = (p: Permission): readonly Permission[] =>
  ((PERMISSIONS[p] as { implies?: readonly Permission[] }).implies ??
    []) as readonly Permission[];

/** Effective = expand(role permissions ∪ grants). */
export function effectivePermissions(input: AccessInput): Set<Permission> {
  if (input.admin) return new Set(PERMISSION_KEYS);
  return expand([
    ...input.roles.flatMap((r) => r.permissions),
    ...input.grants,
  ]);
}

/** `effectivePermissions` plus where each one comes from, for the admin UI. */
export function explainPermissions(
  input: AccessInput,
): Record<Permission, Explanation> {
  const effective = effectivePermissions(input);
  const out = {} as Record<Permission, Explanation>;
  for (const p of PERMISSION_KEYS) {
    const sources: Source[] = [];
    if (input.admin) sources.push({ kind: "admin" });
    if (input.grants.includes(p)) sources.push({ kind: "grant" });
    for (const r of input.roles) {
      if (r.permissions.includes(p))
        sources.push({ kind: "role", role: r.name });
    }
    for (const q of PERMISSION_KEYS) {
      if (q !== p && expand([q]).has(p) && effective.has(q)) {
        sources.push({ kind: "implied", by: q });
      }
    }
    out[p] = { effective: effective.has(p), sources };
  }
  return out;
}

export function describeSource(source: Source): string {
  switch (source.kind) {
    case "admin":
      return "Admin";
    case "grant":
      return "Granted";
    case "role":
      return `Role: ${source.role}`;
    case "implied":
      return `Implied by ${PERMISSIONS[source.by].label}`;
  }
}
