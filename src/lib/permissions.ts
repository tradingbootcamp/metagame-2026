// The permission catalog and the pure resolution over it. One entry per gate
// the code enforces; the roles and per-user grants that hold them live in
// Postgres (src/db/schema/permissions.ts) and are read by src/lib/access.ts.
// Adding a gate means adding its key here, nothing else. Keys with no gate
// yet wait for their page: checkin.manage lands with the check-in page.

/** Display only: how much a permission lets its holder change. */
export type PermissionLevel = "view" | "edit" | "delete";

// Grouped by area, and within an area in the order view, edit, delete; the
// roles grid renders a heading per group, so labels name the action.
export const PERMISSIONS = {
  "users.view": {
    group: "Users",
    level: "view",
    label: "Browse accounts",
    description:
      "The account list and each one's roles, permissions and tickets.",
  },
  "users.edit": {
    group: "Users",
    level: "edit",
    label: "Assign roles and grants",
    description: "Change other accounts' roles and per-user permissions.",
    implies: ["users.view"],
  },
  "users.delete": {
    group: "Users",
    level: "delete",
    label: "Delete accounts",
    description:
      "Permanently delete non-admin accounts. Admin, bans and deleting an admin stay admin-only.",
    implies: ["users.view"],
  },
  "roles.manage": {
    group: "Roles",
    level: "edit",
    label: "Create and edit roles",
    description: "Make roles and change which permissions each carries.",
  },
  "tickets.view": {
    group: "Tickets",
    level: "view",
    label: "See every ticket",
    description: "Each ticket with its buyer, holder and attendee.",
  },
  "schedule.preview": {
    group: "Schedule",
    level: "view",
    label: "Preview before launch",
    description: "See the public schedule before it opens.",
  },
  "schedule.manage": {
    group: "Schedule",
    level: "edit",
    label: "Edit rooms and sessions",
    description: "On the admin grid and over the API.",
    implies: ["schedule.preview"],
  },
  "promo.manage": {
    group: "Promo codes",
    level: "edit",
    label: "Mint and disable codes",
    description: "Comp and discount codes on Stripe or BTC.",
  },
  "links.manage": {
    group: "Tracking links",
    level: "edit",
    label: "Make short links",
    description: "Short /go/ links with UTM attribution.",
  },
  // Not enforced yet: the /account flow is META-4540.
  "api_keys.self": {
    group: "API keys",
    level: "edit",
    label: "Keys for your own account",
    description: "Mint and revoke your own API keys.",
  },
  "api_keys.manage": {
    group: "API keys",
    level: "edit",
    label: "Keys for any account",
    description:
      "Mint and revoke anyone's API keys; keys for admins stay admin-only.",
  },
  "schema.view": {
    group: "Database",
    level: "view",
    label: "See the database schema",
    description: "Read-only, under /admin/schema.",
  },
  "submissions.grade": {
    group: "Grading",
    level: "edit",
    label: "Grade session submissions",
    description: "The speaker committee's rubric at /grade.",
  },
} as const satisfies Record<
  string,
  {
    group: string;
    level: PermissionLevel;
    label: string;
    description: string;
    implies?: readonly string[];
  }
>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

/** The catalog in display order, one entry per area. */
export function permissionGroups(): { group: string; keys: Permission[] }[] {
  const out: { group: string; keys: Permission[] }[] = [];
  for (const key of PERMISSION_KEYS) {
    const { group } = PERMISSIONS[key];
    const last = out.at(-1);
    if (last?.group === group) last.keys.push(key);
    else out.push({ group, keys: [key] });
  }
  return out;
}

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
      return `Implied by ${PERMISSIONS[source.by].group}: ${PERMISSIONS[source.by].label}`;
  }
}
