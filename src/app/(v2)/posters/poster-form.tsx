"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ChevronDown, QrCode } from "lucide-react";
import type { PosterOption, PosterTracking } from "@/lib/poster-options";
import {
  isPosterQrStyle,
  POSTER_QR_STYLE_KEYS,
  POSTER_QR_STYLES,
  posterQrLogo,
  type PosterQrStyle,
} from "@/lib/qr-styles";
import { PROMO_PARAM, promoCode } from "@/lib/tracking-links";
import Mg2Die from "@/v2/components/nav/Mg2Die";
import { LogoDie } from "@/v2/components/nav/LogoDice";

export type PromoChoice = { code: string; label: string };
/** A style's modules as SVG path data in module units, and its logo clearing. */
export type QrPreview = { d: string; size: number; clear: number };

const inputClass =
  "mt-2 w-full rounded-lg border border-[#19345b]/30 bg-white p-3 text-base";

export default function PosterForm({
  options,
  initialArea,
  promos,
  qrPreviews,
}: {
  options: PosterOption[];
  initialArea: string;
  /** Suggested codes for staff with promo.view; empty for everyone else. */
  promos: PromoChoice[];
  qrPreviews: Record<PosterQrStyle, QrPreview>;
}) {
  const [area, setArea] = useState(
    options.some((option) => option.value === initialArea) ? initialArea : "",
  );
  const [design, setDesign] = useState("d20");
  const [size, setSize] = useState("letter");
  const [qr, setQr] = useQrStyle();
  const [promo, setPromo] = useState("");
  // A /buy/<code> location applies its own code, which replaces any typed one.
  const own =
    options.find((option) => option.value === area)?.tracking?.promo ?? "";
  const promoBad = !own && promo !== "" && promoCode(promo) !== promo;
  const check = usePromoCheck(own || (promoBad ? "" : promo));
  // Previews and downloads only carry a code Stripe will honor.
  const live = check.state === "ok" ? check.code : "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = options.find((option) => option.value === area);
  const query = new URLSearchParams({
    area,
    design,
    size,
    ...(live ? { [PROMO_PARAM]: live } : {}),
    ...(qr === "square" ? {} : { qr }),
  }).toString();
  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/posters?${query}`);
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? "This location’s poster link is not ready yet. Please choose another location or try again later."
            : "We couldn’t create your poster. Please try again shortly.",
        );
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `metagame-${design}${live ? `-${live}` : ""}-${size}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
        {selected?.available ? (
          <iframe
            key={query}
            title="Poster preview"
            src={`/api/posters?${query}&preview=1#toolbar=0&navpanes=0&view=Fit`}
            className={`block w-full rounded-lg border border-[#19345b]/20 bg-white ${
              landscape ? "" : "mx-auto max-w-md"
            }`}
            style={{
              aspectRatio: landscape
                ? size === "letter"
                  ? "11 / 8.5"
                  : "19 / 13"
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
            {selected
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
          promo={own ? "" : live}
        />
        <PromoField
          promos={promos}
          value={own || promo}
          locked={!!own}
          onChange={setPromo}
          hint={
            promoBad
              ? {
                  bad: true,
                  text: "Codes use letters, numbers, dashes, and underscores only.",
                }
              : check.state === "ok"
                ? {
                    bad: false,
                    text: own
                      ? `✓ ${check.discount} off. This location’s link applies ${own} itself.`
                      : `✓ ${check.discount} off. Printed on the poster and auto-applied after scanning.`,
                  }
                : check.state === "bad"
                  ? { bad: true, text: check.error }
                  : check.state === "checking"
                    ? { bad: false, text: "Checking code…" }
                    : {
                        bad: false,
                        text: "Printed on the poster and auto-applied after scanning the QR code.",
                      }
          }
        />
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
        <QrStylePicker value={qr} onChange={setQr} previews={qrPreviews} />
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
        <button
          disabled={
            !selected?.available || busy || ((own || promo) !== "" && !live)
          }
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

type PromoCheck =
  | { state: "idle" | "checking" }
  | { state: "ok"; code: string; discount: string }
  | { state: "bad"; error: string };

function usePromoCheck(code: string): PromoCheck {
  const [result, setResult] = useState<PromoCheck & { for?: string }>({
    state: "idle",
  });
  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/posters?${new URLSearchParams({ check: "1", [PROMO_PARAM]: code })}`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const body = await response.json();
          setResult({
            state: "ok",
            code: body.code,
            discount: body.discount,
            for: code,
          });
        } else
          setResult({
            state: "bad",
            error:
              response.status === 422
                ? "✗ This code can’t be used on a poster."
                : "Couldn’t check that code. Retype it to try again.",
            for: code,
          });
      } catch {
        if (controller.signal.aborted) return;
        setResult({
          state: "bad",
          error: "Couldn’t check that code. Retype it to try again.",
          for: code,
        });
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [code]);
  if (!code) return { state: "idle" };
  return result.for === code ? result : { state: "checking" };
}

function PromoField({
  promos,
  value,
  locked,
  onChange,
  hint,
}: {
  promos: PromoChoice[];
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
  hint: { bad: boolean; text: string };
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const needle = value.toLowerCase();
  const filtered = promos.filter(
    (choice) =>
      choice.code.toLowerCase().includes(needle) ||
      choice.label.toLowerCase().includes(needle),
  );
  const listed = promos.length > 0 && !locked;
  function choose(choice: PromoChoice) {
    onChange(choice.code);
    setOpen(false);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!listed) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (filtered.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((active + step + filtered.length) % filtered.length);
    } else if (event.key === "Enter" && open && filtered[active]) {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }
  return (
    <div className="relative">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block font-semibold">
          Promo code <span className="font-normal">(optional)</span>
        </label>
        {/* The tool itself prompts sign-in or explains missing access. */}
        <a
          href="/backstage/promo"
          target="_blank"
          rel="noopener"
          className="text-xs text-[#19345b]/60 underline-offset-2 hover:underline"
        >
          Make a code ↗
        </a>
      </div>
      <div className="relative">
        <input
          id={id}
          {...(listed && {
            role: "combobox",
            "aria-expanded": open,
            "aria-controls": `${id}-list`,
            "aria-autocomplete": "list" as const,
          })}
          className={`${inputClass} ${listed ? "pr-10" : ""} ${locked ? "bg-[#19345b]/5" : ""}`}
          placeholder={listed ? "Pick a code or type one" : undefined}
          value={value}
          readOnly={locked}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            // Stripe matches codes in any case; posters print them in capitals.
            onChange(event.target.value.trim().toUpperCase());
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {listed && (
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 mt-1 size-5 -translate-y-1/2 text-[#19345b]/50"
          />
        )}
      </div>
      {listed && open && filtered.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-[#19345b]/30 bg-white py-1 shadow-lg"
        >
          {filtered.map((choice, index) => (
            <li
              key={choice.code}
              role="option"
              aria-selected={choice.code === value}
              onClick={() => choose(choice)}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === active ? "bg-[#19345b] text-white" : ""
              }`}
            >
              <span className="font-mono font-semibold">{choice.code}</span>
              <span className="opacity-70"> · {choice.label}</span>
            </li>
          ))}
        </ul>
      )}
      <p
        className={`mt-2 text-xs ${hint.bad ? "text-red-700" : "text-[#19345b]/60"}`}
      >
        {hint.text}
      </p>
    </div>
  );
}

function LocationCombobox({
  options,
  value,
  fallback,
  onChange,
  promo,
}: {
  options: PosterOption[];
  value: string;
  /** Selected while the typed text matches nothing, so a poster always shows. */
  fallback: string;
  onChange: (value: string) => void;
  promo: string;
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
      {selected?.tracking && (
        <TrackingSummary tracking={selected.tracking} promo={promo} />
      )}
    </div>
  );
}

function TrackingSummary({
  tracking,
  promo,
}: {
  tracking: PosterTracking;
  promo: string;
}) {
  const utms = new URL(tracking.redirectUrl).searchParams;
  const qrUrl = promo
    ? `${tracking.qrUrl}?${new URLSearchParams({ [PROMO_PARAM]: promo })}`
    : tracking.qrUrl;
  const tags = ["utm_source", "utm_medium", "utm_content"]
    .map((key) => utms.get(key))
    .join(" · ");
  return (
    <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs text-[#19345b]/60">
      <dt>QR</dt>
      <dd className="font-mono break-all">{qrUrl}</dd>
      <dt>Tracking</dt>
      <dd className="font-mono">{tags}</dd>
    </dl>
  );
}

const QR_STYLE_KEY = "posters-qr-style";

// The last style picked, remembered per browser as a convenience; the server
// render and hydration always see the default.
let pickedQrStyle: PosterQrStyle | null = null;
const qrStyleListeners = new Set<() => void>();

function savedQrStyle(): PosterQrStyle {
  if (pickedQrStyle) return pickedQrStyle;
  try {
    const saved = window.localStorage.getItem(QR_STYLE_KEY) ?? "";
    if (isPosterQrStyle(saved)) return saved;
  } catch {}
  return "square";
}

function useQrStyle() {
  const style = useSyncExternalStore(
    (listener) => {
      qrStyleListeners.add(listener);
      return () => qrStyleListeners.delete(listener);
    },
    savedQrStyle,
    () => "square" as const,
  );
  function choose(next: PosterQrStyle) {
    pickedQrStyle = next;
    try {
      window.localStorage.setItem(QR_STYLE_KEY, next);
    } catch {}
    qrStyleListeners.forEach((listener) => listener());
  }
  return [style, choose] as const;
}

function QrSample({
  style,
  preview,
  className,
}: {
  style: PosterQrStyle;
  preview: QrPreview;
  className?: string;
}) {
  const logo = posterQrLogo(style);
  const span = preview.size + 2;
  const room = `${((preview.clear - 1.2) / span) * 100}%`;
  return (
    <span className={`relative block bg-white ${className ?? ""}`}>
      <svg viewBox={`-1 -1 ${span} ${span}`} className="block size-full">
        <path d={preview.d} fill="#000" />
      </svg>
      {logo && (
        <span
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black"
          style={{ width: room, height: room }}
        >
          {logo === "mg2" ? (
            <Mg2Die className="size-full" />
          ) : (
            <LogoDie className="size-full" />
          )}
        </span>
      )}
    </span>
  );
}

const ARROW_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

function QrStylePicker({
  value,
  onChange,
  previews,
}: {
  value: PosterQrStyle;
  onChange: (style: PosterQrStyle) => void;
  previews: Record<PosterQrStyle, QrPreview>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEPS[event.key];
    if (event.key === "Escape") {
      setOpen(false);
      document.getElementById(`${id}-toggle`)?.focus();
      return;
    }
    if (!step) return;
    event.preventDefault();
    const keys = POSTER_QR_STYLE_KEYS;
    const next = keys[(keys.indexOf(value) + step + keys.length) % keys.length];
    onChange(next);
    radios.current[keys.indexOf(next)]?.focus();
  }
  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          id={`${id}-toggle`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          aria-label="QR code style"
          onClick={() => setOpen(!open)}
          className={`flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            open
              ? "border-[#19345b] bg-[#19345b] text-white"
              : "border-[#19345b]/30 bg-white text-[#19345b] hover:border-[#19345b]/60"
          }`}
        >
          <QrCode aria-hidden className="size-6" />
        </button>
        <p className="text-sm">
          <span className="font-semibold">QR style</span>{" "}
          <span className="text-[#19345b]/70">
            · {POSTER_QR_STYLES[value].label}
          </span>
        </p>
      </div>
      {open && (
        <div
          id={`${id}-panel`}
          role="radiogroup"
          aria-label="QR code style"
          onKeyDown={onKeyDown}
          className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-[#19345b]/20 bg-white p-2"
        >
          {POSTER_QR_STYLE_KEYS.map((style, index) => {
            const checked = style === value;
            return (
              <button
                key={style}
                ref={(el) => {
                  radios.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => onChange(style)}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-md border p-1.5 text-xs transition-colors ${
                  checked
                    ? "border-[#19345b] bg-[#19345b]/10 font-semibold ring-1 ring-[#19345b]"
                    : "border-transparent hover:bg-[#19345b]/5"
                }`}
              >
                <QrSample
                  style={style}
                  preview={previews[style]}
                  className="size-14"
                />
                <span className="w-full text-center leading-tight">
                  {POSTER_QR_STYLES[style].label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
