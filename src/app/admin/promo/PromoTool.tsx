"use client";

import { useState, useTransition } from "react";
import {
  listCodes,
  mint,
  setActive,
  type CodeLists,
  type MintState,
} from "./actions";
import {
  buttonClass,
  fieldClass,
  selectClass,
  selectStyle,
  smallButtonClass,
  useCopy,
} from "../ui";
import { PURPOSES, type MintResult, type Rail } from "@/lib/promo-codes";
import type { BtcCode } from "@/lib/promo-codes-btc";
import type { Coupon, StripeCode } from "@/lib/promo-codes-stripe";
import type { PromoMode } from "@/lib/stripe-promo";

const CUSTOM = "__custom__";
// Coupons are made by hand in the dashboard (the key is Coupons: Read only).
const STRIPE_ACCOUNT = "acct_1QeQd1CtO443EG3n";

const redeemUrl = (origin: string, code: string) =>
  `${origin.replace(/\/$/, "")}/buy/${code}`;

const initial: MintState = {};

export default function PromoTool({
  coupons,
  couponError,
  mode,
  origin,
}: {
  coupons: Coupon[];
  couponError: string | null;
  mode: PromoMode;
  origin: string;
}) {
  const [state, setState] = useState<MintState>(initial);
  const [pending, startTransition] = useTransition();
  const [rail, setRail] = useState<Rail>("stripe");
  const [purpose, setPurpose] = useState("");
  const [unlimited, setUnlimited] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [lists, setLists] = useState<CodeLists | null>(null);
  const [listsBusy, setListsBusy] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);

  const stripeReady = !couponError && coupons.length > 0;
  const defaultCoupon = coupons.find((c) => c.isDefault) ?? coupons[0];

  const err = (field: string) =>
    state.field === field ? (state.error ?? null) : null;

  const loadLists = async () => {
    setListsBusy(true);
    setListsError(null);
    try {
      setLists(await listCodes());
    } catch (e) {
      setListsError(e instanceof Error ? e.message : String(e));
    } finally {
      setListsBusy(false);
    }
  };

  // Plain submit handler rather than a form action so the post-mint cleanup
  // (reset the fields, refresh an open list) can live next to the result.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const next = await mint(state, formData);
      setState(next);
      if (next.minted) {
        form.reset();
        setCustomCode("");
        if (lists) void loadLists();
      }
    });
  };

  return (
    <div className="space-y-10">
      <section className="relative rounded-xl border border-line bg-white p-6 shadow-sm">
        <ModeBadge mode={mode} />
        <h1 className="font-bebas mb-4 text-2xl tracking-wide text-navy">
          New code
        </h1>

        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <Field
            label="Code type"
            className="md:col-span-2"
            hint={
              rail === "btc"
                ? "Writes a discount row in the Airtable “Discount Codes” table (Bitcoin checkout). No Stripe code."
                : "Mints a Stripe promotion code (card checkout). No Airtable row."
            }
          >
            <input type="hidden" name="rail" value={rail} />
            <div
              role="radiogroup"
              className="flex overflow-hidden rounded-lg border border-line"
            >
              {(
                [
                  ["stripe", "Stripe (card)"],
                  ["btc", "BTC (Airtable)"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rail === value}
                  onClick={() => setRail(value)}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${
                    rail === value
                      ? "bg-navy text-cream"
                      : "bg-white text-ink/70 hover:bg-cream"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {rail === "stripe" && (
            <Field
              label="Coupon"
              required
              className="md:col-span-2"
              hint="The discount tier the code attaches to. Defaults to the 100%-off comp coupon."
              error={couponError}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  name="couponId"
                  defaultValue={defaultCoupon?.id ?? ""}
                  disabled={!stripeReady}
                  className={`${selectClass} flex-1`}
                  style={selectStyle}
                >
                  {!stripeReady && (
                    <option value="">No coupons available</option>
                  )}
                  {(
                    [
                      ["amount", "Dollar amount off"],
                      ["percent", "Percent off"],
                    ] as const
                  ).map(([kind, title]) => {
                    const group = coupons.filter((c) => c.kind === kind);
                    return (
                      group.length > 0 && (
                        <optgroup key={kind} label={title}>
                          {group.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </optgroup>
                      )
                    );
                  })}
                </select>
                <a
                  href={`https://dashboard.stripe.com/${STRIPE_ACCOUNT}/${mode === "live" ? "" : "test/"}coupons`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${smallButtonClass} self-start py-2 whitespace-nowrap`}
                >
                  Create new coupon ↗
                </a>
              </div>
            </Field>
          )}

          <Field
            label="Name"
            required
            hint="Who this is for — a person, pseudonym, or group."
            error={err("name")}
          >
            <input
              name="name"
              required
              maxLength={120}
              className={fieldClass}
            />
          </Field>
          <Field
            label="Email"
            hint="Optional. The code is hashed from the email when given, otherwise from the name."
            error={err("email")}
          >
            <input
              name="email"
              type="email"
              autoComplete="off"
              className={fieldClass}
            />
          </Field>

          <Field
            label="Purpose"
            required
            hint="Recorded in the Purpose column of the “Discount Codes” table."
            error={err("purpose")}
            className="md:col-span-2"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                name="purpose"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className={`${selectClass} sm:w-64`}
                style={selectStyle}
              >
                <option value="">Select…</option>
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value={CUSTOM}>Custom…</option>
              </select>
              {purpose === CUSTOM && (
                <input
                  name="customPurpose"
                  required
                  autoFocus
                  placeholder="e.g. Contest winner"
                  maxLength={60}
                  className={fieldClass}
                />
              )}
            </div>
            {purpose === CUSTOM && (
              <p className="mt-2 rounded-lg border border-tan bg-peach/40 px-3 py-2 text-xs text-ink/80">
                A custom purpose becomes a <strong>permanent</strong> option in
                Airtable, offered for every future code. Make sure it’s a
                genuinely distinct category, not a variant of an existing one.
              </p>
            )}
          </Field>

          <Field
            label="Custom code"
            hint="Leave blank for a deterministic COMP-XXXXX code."
            error={err("customCode")}
          >
            <input
              name="customCode"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              className={`${fieldClass} font-mono`}
            />
          </Field>
          <Field
            label="Uses"
            hint={
              unlimited
                ? `Redeemable unlimited times (${rail === "btc" ? "blank Max Uses on the row" : "no max_redemptions on the promo"}).`
                : `How many times it can be redeemed. Default 1 (single guest); enforced ${rail === "btc" ? "by the Bitcoin checkout via Max Uses" : "by Stripe via max_redemptions"}.`
            }
          >
            <div className="flex items-center gap-4">
              <input
                name="uses"
                type="number"
                min={1}
                step={1}
                defaultValue={1}
                disabled={unlimited}
                className={`${fieldClass} w-28 disabled:bg-cream disabled:text-ink/40`}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  name="unlimited"
                  type="checkbox"
                  checked={unlimited}
                  onChange={(e) => setUnlimited(e.target.checked)}
                />
                Unlimited
              </label>
            </div>
          </Field>

          <Field label="Notes" className="md:col-span-2">
            <textarea
              name="notes"
              rows={2}
              maxLength={500}
              placeholder="Anything worth remembering about this code"
              className={`${fieldClass} resize-y`}
            />
          </Field>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={pending || (rail === "stripe" && !stripeReady)}
              className={buttonClass}
            >
              {pending ? "Minting…" : "Generate code"}
            </button>
            <p aria-live="polite" className="min-h-5 text-sm text-meeple">
              {state.error && !state.field ? state.error : null}
            </p>
          </div>
        </form>

        {state.minted && (
          <Result
            key={`${state.minted.rail}:${state.minted.code}`}
            minted={state.minted}
            origin={origin}
          />
        )}
      </section>

      <Existing
        lists={lists}
        busy={listsBusy}
        error={listsError}
        origin={origin}
        onLoad={loadLists}
      />
    </div>
  );
}

function ModeBadge({ mode }: { mode: PromoMode }) {
  return (
    <span
      className={`absolute top-4 right-4 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
        mode === "live"
          ? "border-moss/40 bg-moss/15 text-moss"
          : "border-tan bg-peach/50 text-ink/80"
      }`}
    >
      {mode === "live" ? "Live" : "Test mode"}
    </span>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`text-sm ${className}`}>
      <span className="mb-1 block text-ink/70">
        {label}
        {required && (
          <span aria-hidden className="text-meeple">
            {" "}
            *
          </span>
        )}
      </span>
      {children}
      <span
        aria-live="polite"
        className={`mt-1 block text-xs ${error ? "text-meeple" : "text-ink/50"}`}
      >
        {error ?? hint}
      </span>
    </div>
  );
}

function CopyButtons({ code, url }: { code: string; url?: string }) {
  const codeCopy = useCopy();
  const urlCopy = useCopy();
  const label = (status: string, idle: string) =>
    status === "copied" ? "Copied" : status === "failed" ? "Select it" : idle;
  return (
    <>
      <button
        type="button"
        onClick={() => codeCopy.copy(code)}
        className={smallButtonClass}
      >
        {label(codeCopy.status, "Copy code")}
      </button>
      {url && (
        <button
          type="button"
          onClick={() => urlCopy.copy(url)}
          className={smallButtonClass}
        >
          {label(urlCopy.status, "Copy link")}
        </button>
      )}
    </>
  );
}

function Result({ minted, origin }: { minted: MintResult; origin: string }) {
  const railName = minted.rail === "btc" ? "BTC discount code" : "Stripe code";
  const url =
    minted.rail === "stripe" ? redeemUrl(origin, minted.code) : undefined;
  const { prior } = minted;
  return (
    <div
      className={`mt-6 rounded-lg border p-4 ${
        minted.reused ? "border-tan bg-peach/30" : "border-navy/30 bg-cream"
      }`}
    >
      {minted.reused ? (
        <div className="text-sm text-ink/80">
          <p className="font-semibold">
            Not a new code — this {railName} was already issued
          </p>
          <p>
            to <strong>{prior?.name || "unnamed"}</strong> (
            {prior?.email || "no email"})
            {prior?.created
              ? ` on ${new Date(prior.created * 1000).toLocaleDateString()}`
              : ""}
            {prior?.purpose ? ` as ${prior.purpose}` : ""}
            {prior?.redeemed ? ` · already redeemed ${prior.redeemed}×` : ""}.
            Purpose/notes updated to what you just entered.
          </p>
          <p className="mt-1 text-xs text-ink/60">
            Different person with the same name? Add their email and generate
            again to get a distinct code.
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink/70">New {railName}</p>
      )}
      <p className="my-2 font-mono text-2xl break-all text-navy select-all">
        {minted.code}
      </p>
      {url && (
        <p className="mb-2 font-mono text-sm break-all text-ink/70 select-all">
          {url}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <CopyButtons code={minted.code} url={url} />
      </div>
      <p className="mt-3 text-xs text-ink/60">
        {minted.max == null
          ? "Redeemable unlimited times"
          : minted.max > 1
            ? `Redeemable up to ${minted.max} times`
            : "Single use"}
        {" · "}
        {minted.purpose}
        {minted.rail === "btc" &&
          ` · Bitcoin discount row written${minted.test ? " (flagged Test)" : ""}`}
      </p>
    </div>
  );
}

function Existing({
  lists,
  busy,
  error,
  origin,
  onLoad,
}: {
  lists: CodeLists | null;
  busy: boolean;
  error: string | null;
  origin: string;
  onLoad: () => void;
}) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const matches = (c: {
    name: string;
    email: string;
    code: string;
    purpose: string;
  }) =>
    !q ||
    `${c.name} ${c.email} ${c.code} ${c.purpose}`.toLowerCase().includes(q);

  const toggle = async (c: StripeCode) => {
    const active = !c.active;
    if (
      !active &&
      !window.confirm(
        `Archive ${c.code}? It stops working (you can restore it later).`,
      )
    )
      return;
    setActing(c.id);
    setActionError(null);
    const res = await setActive(c.id, active);
    if (res.error) setActionError(res.error);
    else onLoad();
    setActing(null);
  };

  if (!lists) {
    return (
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bebas text-2xl tracking-wide text-navy">
            Existing codes
          </h2>
          <button
            type="button"
            onClick={onLoad}
            disabled={busy}
            className={smallButtonClass}
          >
            {busy ? "Loading…" : "Load"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-meeple">{error}</p>}
      </section>
    );
  }

  const stripeShown = lists.stripe.filter(matches);
  const stripeActive = stripeShown.filter((c) => c.active);
  const stripeArchived = stripeShown.filter((c) => !c.active);
  const btcShown = lists.btc.filter(matches);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-bebas text-2xl tracking-wide text-navy">
          Existing codes
        </h2>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Filter by name, email, code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${fieldClass} w-56`}
          />
          <button
            type="button"
            onClick={onLoad}
            disabled={busy}
            className={smallButtonClass}
          >
            {busy ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      {(error || actionError) && (
        <p className="text-sm text-meeple">{error ?? actionError}</p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink/70">
          Stripe (card){" "}
          <span className="font-normal text-ink/50">
            ({lists.stripe.length})
          </span>
        </h3>
        {lists.errors.stripe ? (
          <p className="text-sm text-meeple">{lists.errors.stripe}</p>
        ) : stripeShown.length === 0 ? (
          <p className="text-sm text-ink/60">
            {lists.stripe.length ? "No matches." : "No codes yet."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {stripeActive.map((c) => (
                <StripeRow
                  key={c.id}
                  code={c}
                  url={redeemUrl(origin, c.code)}
                  acting={acting === c.id}
                  onToggle={() => toggle(c)}
                />
              ))}
            </ul>
            {stripeArchived.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowArchived((s) => !s)}
                  aria-expanded={showArchived}
                  className="text-sm text-ink/60 underline-offset-2 hover:underline"
                >
                  {showArchived ? "Hide" : "Show"} archived (
                  {stripeArchived.length})
                </button>
                {showArchived && (
                  <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white opacity-70">
                    {stripeArchived.map((c) => (
                      <StripeRow
                        key={c.id}
                        code={c}
                        url={redeemUrl(origin, c.code)}
                        acting={acting === c.id}
                        onToggle={() => toggle(c)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold text-ink/70">
          BTC (Airtable){" "}
          <span className="font-normal text-ink/50">({lists.btc.length})</span>
        </h3>
        <p className="mb-2 text-xs text-ink/50">
          Read-only — archive or disable BTC rows directly in Airtable.
        </p>
        {lists.errors.btc ? (
          <p className="text-sm text-meeple">{lists.errors.btc}</p>
        ) : btcShown.length === 0 ? (
          <p className="text-sm text-ink/60">
            {lists.btc.length ? "No matches." : "No codes yet."}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {btcShown.map((c) => (
              <BtcRow key={c.code} code={c} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function StripeRow({
  code: c,
  url,
  acting,
  onToggle,
}: {
  code: StripeCode;
  url: string;
  acting: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-semibold">{c.code}</span>
          {c.coupon && <Tag>{c.coupon}</Tag>}
          {c.purpose && <Tag title={c.notes || undefined}>{c.purpose}</Tag>}
          {c.max != null && c.max > 1 ? (
            <Tag warn={c.redeemed > 0}>
              {c.redeemed}/{c.max} used
            </Tag>
          ) : c.max == null ? (
            <Tag>unlimited{c.redeemed ? ` · ${c.redeemed} used` : ""}</Tag>
          ) : (
            c.redeemed > 0 && <Tag warn>used</Tag>
          )}
        </div>
        <p className="truncate text-xs text-ink/60">
          {c.name ? `${c.name} · ` : ""}
          {c.email || "—"} · {new Date(c.created * 1000).toLocaleDateString()}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButtons code={c.code} url={url} />
        <button
          type="button"
          onClick={onToggle}
          disabled={acting}
          className={smallButtonClass}
        >
          {c.active ? "Archive" : "Restore"}
        </button>
      </div>
    </li>
  );
}

function BtcRow({ code: c }: { code: BtcCode }) {
  const live = c.active && !c.archived;
  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${live ? "" : "opacity-60"}`}
    >
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-semibold">{c.code}</span>
          {c.purpose && <Tag title={c.notes || undefined}>{c.purpose}</Tag>}
          <Tag>{c.max == null ? "unlimited" : `max ${c.max}`}</Tag>
          {c.test && <Tag warn>test</Tag>}
          {!live && <Tag warn>{c.archived ? "archived" : "inactive"}</Tag>}
        </div>
        <p className="truncate text-xs text-ink/60">
          {c.name ? `${c.name} · ` : ""}
          {c.email || "—"}
          {c.created && ` · ${new Date(c.created * 1000).toLocaleDateString()}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButtons code={c.code} />
      </div>
    </li>
  );
}

function Tag({
  children,
  warn,
  title,
}: {
  children: React.ReactNode;
  warn?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`rounded px-1.5 py-0.5 text-[11px] tracking-wide uppercase ${
        warn ? "bg-peach/60 text-ink/80" : "bg-navy/10 text-navy"
      }`}
    >
      {children}
    </span>
  );
}
