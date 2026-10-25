"use client";

import {
  useId,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ChevronDown } from "lucide-react";
import type { PosterOption, PosterTracking } from "@/lib/poster-options";
import type { DiscountOption } from "@/lib/stripe-poster-discounts";

const inputClass =
  "mt-2 w-full rounded-lg border border-[#19345b]/30 bg-white p-3 text-base";

export default function PosterForm({
  options,
  initialArea,
  discounts,
}: {
  options: PosterOption[];
  initialArea: string;
  discounts: {
    stripe: DiscountOption[];
    btc: DiscountOption[];
    unavailable: boolean;
  } | null;
}) {
  const [area, setArea] = useState(
    options.some((option) => option.value === initialArea) ? initialArea : "",
  );
  const [design, setDesign] = useState("d20");
  const [size, setSize] = useState("letter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stripe, setStripe] = useState("");
  const [btc, setBtc] = useState("");
  const [prepared, setPrepared] = useState<{
    query: string;
    url: string;
    slug: string;
  } | null>(null);
  useEffect(
    () => () => {
      if (prepared) URL.revokeObjectURL(prepared.url);
    },
    [prepared],
  );
  const discounted = Boolean(stripe || btc);
  const selected = options.find((option) => option.value === area);
  const query = new URLSearchParams({
    area,
    design,
    size,
    ...(discounted ? { stripe, btc } : {}),
  }).toString();
  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await prepare(true);
  }
  async function prepare(downloadFile: boolean) {
    setError("");
    setBusy(true);
    try {
      const response = discounted
        ? await fetch("/api/posters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ area, design, size, stripe, btc }),
          })
        : await fetch(`/api/posters?${query}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "We couldn't create your poster. Please try again shortly.",
        );
      }
      const url = URL.createObjectURL(await response.blob());
      setPrepared({
        query,
        url,
        slug: response.headers.get("X-Poster-Slug") ?? "",
      });
      if (downloadFile) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `metagame-${design}-${size}.pdf`;
        anchor.click();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }
  const landscape = design === "chess";
  return (
    <form
      onSubmit={download}
      className="grid gap-8 rounded-2xl border border-[#19345b]/20 bg-white/60 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="min-w-0">
        {selected?.available && (!discounted || prepared?.query === query) ? (
          <iframe
            key={query}
            title="Poster preview"
            src={
              discounted
                ? `${prepared!.url}#toolbar=0&navpanes=0&view=Fit`
                : `/api/posters?${query}&preview=1#toolbar=0&navpanes=0&view=Fit`
            }
            className={`block w-full rounded-lg border border-[#19345b]/20 bg-white ${
              landscape ? "" : "mx-auto max-w-md"
            }`}
            style={{
              aspectRatio: landscape
                ? "11 / 8.5"
                : size === "letter"
                  ? "8.5 / 11"
                  : "13 / 19",
            }}
          />
        ) : (
          <p
            role="status"
            className="flex aspect-[8.5/11] max-w-md items-center justify-center rounded-lg border border-dashed border-[#19345b]/30 p-6 text-center text-sm"
          >
            {selected?.available && discounted
              ? "Preview or download to prepare the poster with your selected discounts."
              : selected
                ? "This location has more than one poster link, so its QR code is ambiguous. Fix the duplicate in the tracking links table."
                : "Choose a poster location to see a preview."}
          </p>
        )}
      </div>
      <div className="space-y-6">
        <LocationCombobox
          options={options}
          value={area}
          fallback={initialArea}
          onChange={setArea}
          showTracking={!discounted}
        />
        {discounts && (
          <fieldset className="space-y-3" disabled={busy}>
            <legend className="font-semibold">Staff discounts</legend>
            <label className="block text-sm">
              Card / USD discount
              <select
                className={inputClass}
                value={stripe}
                onChange={(event) => setStripe(event.target.value)}
              >
                <option value="">No additional discount</option>
                {discounts.stripe.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Bitcoin discount
              <select
                className={inputClass}
                value={btc}
                onChange={(event) => setBtc(event.target.value)}
              >
                <option value="">No additional discount</option>
                {discounts.btc.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-[#19345b]/70">
              Existing live codes for Standard tickets only. Each selection
              applies only to its payment method. Empty selections leave normal
              pricing and existing offers unchanged. Codes are checked again at
              checkout.
            </p>
            {discounts.unavailable && (
              <p role="status" className="text-sm">
                Some discount options could not be loaded. Reload to try again.
              </p>
            )}
          </fieldset>
        )}
        <label className="block font-semibold">
          Design
          <select
            aria-label="Design"
            className={inputClass}
            value={design}
            onChange={(event) => setDesign(event.target.value)}
          >
            <option value="d20">Portrait · Dice puzzle</option>
            <option value="chess">Landscape · Chess</option>
          </select>
        </label>
        <label className="block font-semibold">
          Paper size
          <select
            aria-label="Paper size"
            className={inputClass}
            value={size}
            onChange={(event) => setSize(event.target.value)}
          >
            <option value="letter">US Letter · 8.5 × 11 in</option>
            <option value="13x19">Super B / A3+ (13 × 19 in)</option>
          </select>
          {size === "13x19" && (
            <p className="mt-2 text-xs font-normal text-[#19345b]/60">
              Print on Super B (A3+) paper.
            </p>
          )}
        </label>
        {error && (
          <p role="alert" className="text-red-800">
            {error}
          </p>
        )}
        {discounted && (
          <button
            type="button"
            disabled={!selected?.available || busy}
            onClick={() => void prepare(false)}
            className="w-full rounded-lg border border-[#19345b] px-6 py-3 font-semibold disabled:opacity-40"
          >
            Preview discounted poster
          </button>
        )}
        {discounted && prepared?.query === query && prepared.slug && (
          <p className="text-xs break-all">
            QR: https://metagame.games/go/{prepared.slug}
          </p>
        )}
        <button
          disabled={!selected?.available || busy}
          className="w-full rounded-lg bg-[#19345b] px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Preparing your PDF…" : "Download PDF"}
        </button>
        <p className="text-sm" aria-live="polite">
          {selected?.available
            ? `${selected.label} · ${landscape ? "Landscape" : "Portrait"} · ${size === "letter" ? "US Letter" : "Super B 13 × 19 in"}`
            : "Select an available location to download."}
        </p>
      </div>
    </form>
  );
}

function LocationCombobox({
  options,
  value,
  fallback,
  onChange,
  showTracking,
}: {
  options: PosterOption[];
  value: string;
  /** Selected while the typed text matches nothing, so a poster always shows. */
  fallback: string;
  onChange: (value: string) => void;
  showTracking: boolean;
}) {
  const id = useId();
  const selected = options.find((option) => option.value === value);
  const [text, setText] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Focusing selects the whole label so typing replaces it. The mouseup that
  // follows a click would collapse that selection, so swallow it once.
  const selectOnMouseUp = useRef(false);
  // Show the full list while the field still reads the current selection.
  // Generic is always offered, last when it isn't itself a match.
  function matches(typed: string): PosterOption[] {
    const needle = typed.trim().toLowerCase();
    if (!needle || typed === selected?.label) return options;
    const hits = options.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
    const generic = options.find((option) => option.value === fallback);
    if (generic && !hits.includes(generic)) hits.push(generic);
    return hits;
  }
  const filtered = matches(text);
  function choose(option: PosterOption) {
    onChange(option.value);
    setText(option.label);
    setOpen(false);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (filtered.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (active + step + filtered.length) % filtered.length;
      setActive(next);
      onChange(filtered[next].value);
    } else if (event.key === "Enter" && open && filtered[active]) {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }
  return (
    <div className="relative">
      <label htmlFor={id} className="block font-semibold">
        Poster location
      </label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          className={`${inputClass} pr-10`}
          placeholder="Type to filter locations"
          value={text}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.select();
            selectOnMouseUp.current = true;
          }}
          onMouseUp={(event: MouseEvent<HTMLInputElement>) => {
            if (selectOnMouseUp.current) event.preventDefault();
            selectOnMouseUp.current = false;
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            const typed = event.target.value;
            setText(typed);
            setActive(0);
            setOpen(true);
            // The preview mirrors the top match as the user types.
            const candidates = matches(typed);
            const exact = candidates.find(
              (option) =>
                option.label.toLowerCase() === typed.trim().toLowerCase(),
            );
            onChange(exact?.value ?? candidates[0]?.value ?? "");
          }}
          onBlur={() => {
            setOpen(false);
            setText(selected?.label ?? "");
          }}
          onKeyDown={onKeyDown}
        />
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 mt-1 size-5 -translate-y-1/2 text-[#19345b]/50"
        />
      </div>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-[#19345b]/30 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm opacity-70">
              No matching locations
            </li>
          )}
          {filtered.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => choose(option)}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === active ? "bg-[#19345b] text-white" : ""
              } ${option.available ? "" : "opacity-60"}`}
            >
              {option.label}
              {option.available ? "" : " — unavailable"}
            </li>
          ))}
        </ul>
      )}
      {showTracking && selected?.tracking && (
        <TrackingSummary tracking={selected.tracking} />
      )}
    </div>
  );
}

function TrackingSummary({ tracking }: { tracking: PosterTracking }) {
  const utms = new URL(tracking.redirectUrl).searchParams;
  const tags = ["utm_source", "utm_medium", "utm_content"]
    .map((key) => utms.get(key))
    .join(" · ");
  return (
    <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs text-[#19345b]/60">
      <dt>QR</dt>
      <dd className="font-mono break-all">{tracking.qrUrl}</dd>
      <dt>Tracking</dt>
      <dd className="font-mono">{tags}</dd>
    </dl>
  );
}
