import Link from "next/link";
import { connection } from "next/server";
import GuideActions from "./GuideActions";
import ToolSignIn from "@/components/ToolSignIn";
import { teamAccess } from "@/lib/access";
import {
  API_AREAS,
  API_KEY_HEADER,
  apiGuideMarkdown,
  TYPES,
  type Endpoint,
  type Field,
} from "@/lib/api-docs";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { siteOriginFromHeaders } from "@/lib/site-origin";

const METHOD_CLASS: Record<Endpoint["method"], string> = {
  GET: "bg-navy/10 text-navy",
  POST: "bg-emerald-100 text-emerald-800",
  PUT: "bg-amber-100 text-amber-800",
  PATCH: "bg-amber-100 text-amber-800",
  DELETE: "bg-meeple/15 text-meeple",
};

export default async function AdminApiDocsPage() {
  await connection();
  const access = await teamAccess();
  if (!access?.permissions.has("api_docs.view"))
    return <ToolSignIn title="API docs" next="/backstage/api-docs" />;

  const origin = await siteOriginFromHeaders();
  const held = access.permissions;

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-xl border border-line bg-white p-5 shadow-sm">
        <p className="text-sm text-ink/70">
          Send a key from{" "}
          <Link
            href="/backstage/api-keys"
            className="underline hover:text-meeple"
          >
            API keys
          </Link>{" "}
          in the <code>{API_KEY_HEADER}</code> header. It acts as your account,
          so each endpoint needs the permission shown; the ones you hold are
          marked. Errors are <code>{"{ error, field? }"}</code>.
        </p>
        <p className="text-sm text-ink/70">
          To hand this to an agent, copy or download the guide, or point it at{" "}
          <code className="break-all">{origin}/api/admin/docs</code> with the
          key.
        </p>
        <GuideActions markdown={apiGuideMarkdown(origin)} />
      </section>

      <section className="space-y-2">
        <h2 className="font-bebas text-2xl tracking-wide text-navy">
          Shared shapes
        </h2>
        <dl className="space-y-2 rounded-xl border border-line bg-white p-5 text-sm shadow-sm">
          {TYPES.map((t) => (
            <div key={t.name}>
              <dt className="font-semibold text-navy">{t.name}</dt>
              <dd className="font-mono text-xs break-words text-ink/70">
                {t.shape}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {API_AREAS.map((area) => (
        <section key={area.title} className="space-y-3">
          <div>
            <h2 className="font-bebas text-2xl tracking-wide text-navy">
              {area.title}
            </h2>
            {area.blurb && <p className="text-sm text-ink/60">{area.blurb}</p>}
          </div>
          <ul className="space-y-3">
            {area.endpoints.map((e) => (
              <EndpointCard
                key={`${e.method} ${e.path}`}
                endpoint={e}
                held={held}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EndpointCard({
  endpoint: e,
  held,
}: {
  endpoint: Endpoint;
  held: Set<Permission>;
}) {
  const fields = (e.query?.length ?? 0) + (e.body?.length ?? 0);
  return (
    <li className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${METHOD_CLASS[e.method]}`}
        >
          {e.method}
        </span>
        <code className="text-sm break-all text-navy">{e.path}</code>
      </div>
      <p className="mt-2 text-sm text-ink/80">{e.summary}</p>
      <p className="mt-1 text-xs text-ink/50">
        {held.has(e.permission) ? "✓ " : ""}
        <code>{e.permission}</code> · {PERMISSIONS[e.permission].label}
      </p>
      {fields > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink/60 hover:text-navy">
            {e.query?.length ? "Query" : "Body"}
            {e.bodyType ? ` (${e.bodyType})` : ""} · {fields} field
            {fields === 1 ? "" : "s"}
          </summary>
          {e.query && <FieldList fields={e.query} />}
          {e.body && <FieldList fields={e.body} />}
        </details>
      )}
      <p className="mt-3 font-mono text-xs break-words text-ink/70">
        → {e.response}
      </p>
    </li>
  );
}

function FieldList({ fields }: { fields: Field[] }) {
  return (
    <dl className="mt-2 divide-y divide-line">
      {fields.map((f) => (
        <div key={f.name} className="py-1.5">
          <dt className="flex flex-wrap items-baseline gap-x-2">
            <code className="font-semibold text-navy">{f.name}</code>
            <span className="font-mono text-xs break-all text-ink/50">
              {f.type}
            </span>
            {f.required && (
              <span className="text-xs text-meeple">required</span>
            )}
          </dt>
          {f.note && <dd className="text-xs text-ink/60">{f.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
