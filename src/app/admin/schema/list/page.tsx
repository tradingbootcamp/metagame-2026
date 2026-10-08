import { connection } from "next/server";
import { PasswordForm } from "../../links/SignInForms";
import { isConfigured, readSession } from "@/lib/admin-auth";
import { describeSchema, type TableInfo } from "@/db/describe";

export default async function AdminSchemaListPage() {
  await connection();

  if (!isConfigured()) {
    return (
      <p className="mx-auto max-w-sm text-sm text-ink/70">
        Team tools aren’t configured on this deploy — set{" "}
        <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code>.
      </p>
    );
  }
  if (!(await readSession())) return <PasswordForm />;

  const { tables, enums } = describeSchema();
  const relationships = tables.flatMap((t) =>
    t.columns.flatMap((c) =>
      c.references ? [{ from: `${t.name}.${c.name}`, ...c.references }] : [],
    ),
  );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <p className="text-sm text-ink/70">
          Read straight from the Drizzle schema in <code>src/db/schema</code>,
          so this page always matches the code on this deploy. Tables, then how
          they connect, then enums.
        </p>
        <nav className="flex flex-wrap gap-2 text-sm">
          {tables.map((t) => (
            <a
              key={t.name}
              href={`#table-${t.name}`}
              className="rounded-md border border-line bg-white px-2.5 py-1 font-mono text-navy hover:border-navy"
            >
              {t.name}
              <span className="ml-1.5 text-ink/50">{t.columns.length}</span>
            </a>
          ))}
        </nav>
      </section>

      <section className="space-y-2">
        <h2 className="font-bebas text-2xl tracking-wide text-navy">
          Relationships
        </h2>
        <ul className="space-y-1 font-mono text-sm">
          {relationships.map((r) => (
            <li key={r.from}>
              <span className="text-ink">{r.from}</span>
              <span className="text-ink/50"> → </span>
              <a href={`#table-${r.table}`} className="text-navy underline">
                {r.table}.{r.column}
              </a>
              <span className="ml-2 text-xs text-ink/50">
                on delete {r.onDelete}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {tables.map((t) => (
        <TableCard key={t.name} table={t} />
      ))}

      <section className="space-y-2">
        <h2 className="font-bebas text-2xl tracking-wide text-navy">Enums</h2>
        {enums.map((e) => (
          <p key={e.name} className="font-mono text-sm">
            <span className="text-ink">{e.name}</span>
            <span className="text-ink/50"> = </span>
            {e.values.map((v) => (
              <span
                key={v}
                className="mr-1.5 rounded bg-white px-1.5 py-0.5 text-navy ring-1 ring-line"
              >
                {v}
              </span>
            ))}
          </p>
        ))}
      </section>
    </div>
  );
}

function TableCard({ table }: { table: TableInfo }) {
  return (
    <section
      id={`table-${table.name}`}
      className="scroll-mt-20 rounded-xl border border-line bg-white shadow-sm"
    >
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-mono text-lg text-navy">{table.name}</h2>
        {table.note && <p className="mt-1 text-sm text-ink/70">{table.note}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-ink/50 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Column</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Constraints</th>
              <th className="px-4 py-2 font-medium">Default</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-mono">
            {table.columns.map((c) => (
              <tr key={c.name}>
                <td className="px-4 py-2 whitespace-nowrap text-ink">
                  {c.name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-ink/80">
                  {c.type}
                  {c.enumValues && (
                    <span className="ml-1 text-xs text-ink/50">
                      ({c.enumValues.join(" | ")})
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-xs">
                  <span className="flex flex-wrap gap-1">
                    {c.primary && <Tag tone="navy">primary key</Tag>}
                    {c.unique && !c.primary && <Tag tone="navy">unique</Tag>}
                    {!c.nullable && !c.primary && <Tag>not null</Tag>}
                    {c.references && (
                      <a href={`#table-${c.references.table}`}>
                        <Tag tone="meeple">
                          → {c.references.table}.{c.references.column}
                        </Tag>
                      </a>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-ink/60">
                  {c.default ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(table.indexes.length > 0 || table.referencedBy.length > 0) && (
        <div className="space-y-1 border-t border-line px-4 py-3 font-mono text-xs text-ink/70">
          {table.indexes.map((i) => (
            <p key={i.name}>
              {i.unique ? "unique index" : "index"} {i.name} on (
              {i.columns.join(", ")})
            </p>
          ))}
          {table.referencedBy.length > 0 && (
            <p>
              referenced by{" "}
              {table.referencedBy.map((r, idx) => (
                <span key={`${r.table}.${r.column}`}>
                  {idx > 0 && ", "}
                  <a href={`#table-${r.table}`} className="text-navy underline">
                    {r.table}.{r.column}
                  </a>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Tag({
  tone = "ink",
  children,
}: {
  tone?: "ink" | "navy" | "meeple";
  children: React.ReactNode;
}) {
  const color = {
    ink: "text-ink/70 ring-line",
    navy: "text-navy ring-navy/30",
    meeple: "text-meeple ring-meeple/30",
  }[tone];
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-sans whitespace-nowrap ring-1 ${color}`}
    >
      {children}
    </span>
  );
}
