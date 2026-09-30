"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createLink, type CreateState } from "./actions";
import { buttonClass, fieldClass, smallButtonClass } from "./ui";
import {
  DEFAULT_CAMPAIGN,
  GO_PREFIX,
  MEDIUMS,
  normalizeSlug,
  shortUrl,
  type TrackingLink,
} from "@/lib/tracking-links";

type Draft = {
  destination: string;
  source: string;
  medium: string;
  campaign: string;
  placement: string;
  slug: string;
  internalName: string;
};

const emptyDraft = (origin: string): Draft => ({
  destination: `${origin}/`,
  source: "",
  medium: MEDIUMS[0],
  campaign: DEFAULT_CAMPAIGN,
  placement: "",
  slug: "",
  internalName: "",
});

const fromTemplate = (link: TrackingLink, prev: Draft): Draft => ({
  ...prev,
  destination: link.destination,
  source: link.source,
  medium: link.medium,
  campaign: link.campaign,
  placement: link.placement,
  slug: "",
});

const initial: CreateState = {};

export default function LinksTool({
  links: initialLinks,
  origin,
  me,
}: {
  links: TrackingLink[];
  origin: string;
  me: string;
}) {
  const [state, action, pending] = useActionState(createLink, initial);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(origin));
  const [links, setLinks] = useState(initialLinks);
  const formRef = useRef<HTMLFormElement>(null);
  const lastCreated = useRef<string | null>(null);

  // A fresh create lands in the library immediately and resets the form; the
  // server's revalidated list catches up on the next navigation.
  useEffect(() => {
    const created = state.created?.link;
    if (!created || created.id === lastCreated.current) return;
    lastCreated.current = created.id;
    setLinks((prev) => [created, ...prev.filter((l) => l.id !== created.id)]);
    setDraft((prev) => ({
      ...prev,
      slug: "",
      placement: "",
      internalName: "",
    }));
  }, [state.created]);

  const set =
    (key: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const applyTemplate = (link: TrackingLink) => {
    setDraft((prev) => fromTemplate(link, prev));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const templates = links.filter((l) => l.template);
  const previewSlug = normalizeSlug(draft.slug) || "…";
  const err = (field: string) => (state.field === field ? state.error : null);

  return (
    <div className="space-y-10">
      <section
        ref={formRef}
        className="rounded-xl border border-line bg-white p-6 shadow-sm"
      >
        <h1 className="font-bebas mb-4 text-2xl tracking-wide text-navy">
          New link
        </h1>

        {templates.length > 0 && (
          <label className="mb-4 block text-sm">
            <span className="mb-1 block text-ink/70">
              Start from a template
            </span>
            <select
              className={fieldClass}
              value=""
              onChange={(e) => {
                const t = templates.find((l) => l.id === e.target.value);
                if (t) applyTemplate(t);
              }}
            >
              <option value="">Pick one…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.internalName || t.slug}
                </option>
              ))}
            </select>
          </label>
        )}

        <form action={action} className="grid gap-4 md:grid-cols-2">
          <Field
            label="Destination"
            error={err("destination")}
            className="md:col-span-2"
          >
            <input
              name="destination"
              type="url"
              required
              value={draft.destination}
              onChange={set("destination")}
              className={fieldClass}
            />
          </Field>
          <Field
            label="Source"
            hint="e.g. discord, newsletter"
            error={err("source")}
          >
            <input
              name="source"
              required
              value={draft.source}
              onChange={set("source")}
              className={fieldClass}
            />
          </Field>
          <Field label="Medium" error={err("medium")}>
            <select
              name="medium"
              value={draft.medium}
              onChange={set("medium")}
              className={fieldClass}
            >
              {MEDIUMS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Campaign" error={err("campaign")}>
            <input
              name="campaign"
              required
              value={draft.campaign}
              onChange={set("campaign")}
              className={fieldClass}
            />
          </Field>
          <Field
            label="Placement"
            hint="Which community or message. Optional."
            error={err("placement")}
          >
            <input
              name="placement"
              value={draft.placement}
              onChange={set("placement")}
              className={fieldClass}
            />
          </Field>
          <Field
            label="Short name"
            hint="Optional — generated from the placement if blank."
            error={err("slug")}
          >
            <input
              name="slug"
              value={draft.slug}
              onChange={set("slug")}
              className={fieldClass}
            />
            <p className="mt-1 truncate font-mono text-xs text-ink/60">
              {origin}
              {GO_PREFIX}
              {previewSlug}
            </p>
          </Field>
          <Field label="Internal name" hint="Library label only. Optional.">
            <input
              name="internalName"
              maxLength={120}
              value={draft.internalName}
              onChange={set("internalName")}
              className={fieldClass}
            />
          </Field>
          <div className="md:col-span-2">
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? "Creating…" : "Create and copy link"}
            </button>
            <p aria-live="polite" className="min-h-5 text-sm text-meeple">
              {state.error && !state.field ? state.error : null}
            </p>
          </div>
        </form>

        {state.created && (
          <Result
            key={state.created.link.id}
            url={state.created.shortUrl}
            link={state.created.link}
          />
        )}
      </section>

      <Library
        links={links}
        origin={origin}
        me={me}
        onUseTemplate={applyTemplate}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-ink/70">{label}</span>
      {children}
      <span
        aria-live="polite"
        className={`mt-1 block text-xs ${error ? "text-meeple" : "text-ink/50"}`}
      >
        {error ?? hint}
      </span>
    </label>
  );
}

type CopyStatus = "idle" | "copied" | "failed";

function useCopy() {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };
  return { status, copy };
}

function Result({ url, link }: { url: string; link: TrackingLink }) {
  const { status, copy } = useCopy();
  const attempted = useRef(false);
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void copy(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-6 rounded-lg border border-navy/30 bg-cream p-4">
      <p className="text-sm text-ink/70">
        {status === "copied" ? "Copied to clipboard" : "Link created"}
        {status === "failed" && " — copying failed, select the URL below"}
      </p>
      <p className="my-2 font-mono text-lg break-all text-navy select-all">
        {url}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(url)}
          className={smallButtonClass}
        >
          {status === "copied" ? "Copied" : "Copy"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={smallButtonClass}
        >
          Open
        </a>
      </div>
      <p className="mt-3 text-xs text-ink/60">
        → {link.destination} · {link.source} / {link.medium} / {link.campaign}
        {link.placement && ` / ${link.placement}`}
      </p>
    </div>
  );
}

function Library({
  links,
  origin,
  me,
  onUseTemplate,
}: {
  links: TrackingLink[];
  origin: string;
  me: string;
  onUseTemplate: (link: TrackingLink) => void;
}) {
  const [query, setQuery] = useState("");
  const [creator, setCreator] = useState("");
  const creators = useMemo(
    () =>
      Array.from(new Set(links.map((l) => l.createdBy).filter(Boolean))).sort(),
    [links],
  );

  const q = query.trim().toLowerCase();
  const shown = links.filter(
    (l) =>
      (!creator || l.createdBy === creator) &&
      (!q ||
        [
          l.internalName,
          l.slug,
          l.destination,
          l.campaign,
          l.source,
          l.placement,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-bebas text-2xl tracking-wide text-navy">
          Library{" "}
          <span className="text-base text-ink/50">({shown.length})</span>
        </h2>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${fieldClass} w-48`}
          />
          <select
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            className={`${fieldClass} w-40`}
          >
            <option value="">Everyone</option>
            {creators.map((c) => (
              <option key={c} value={c}>
                {c === me ? `${c} (me)` : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-ink/60">No links yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {shown.map((l) => (
            <Row
              key={l.id}
              link={l}
              origin={origin}
              onUseTemplate={onUseTemplate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({
  link,
  origin,
  onUseTemplate,
}: {
  link: TrackingLink;
  origin: string;
  onUseTemplate: (link: TrackingLink) => void;
}) {
  const url = shortUrl(origin, link.slug);
  const { status, copy } = useCopy();
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">
            {link.internalName || link.slug}
          </span>
          {!link.active && <Tag>tracking off</Tag>}
          {link.template && <Tag>template</Tag>}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono break-all text-navy hover:underline"
        >
          {url}
        </a>
        <p className="text-xs break-all text-ink/60">→ {link.destination}</p>
        <p className="text-xs text-ink/60">
          {link.source} / {link.medium} / {link.campaign}
          {link.placement && ` / ${link.placement}`}
          {link.createdBy && ` · ${link.createdBy}`}
          {" · "}
          {new Date(link.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => copy(url)}
          className={smallButtonClass}
        >
          {status === "copied"
            ? "Copied"
            : status === "failed"
              ? "Select URL"
              : "Copy"}
        </button>
        <button
          type="button"
          onClick={() => onUseTemplate(link)}
          className={smallButtonClass}
        >
          Use as template
        </button>
      </div>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-navy/10 px-1.5 py-0.5 text-[11px] tracking-wide text-navy uppercase">
      {children}
    </span>
  );
}
