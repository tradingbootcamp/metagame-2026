"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, ImagePlus, Minus, Plus, X } from "lucide-react";
import {
  MORE_MAX,
  optionBoxes,
  type Answer,
  type Answers,
  type FileAnswer,
  type Option,
  type Question,
} from "@/v2/forms/engine";
import { cn } from "@/v2/lib/utils";
import Glyph from "../Glyph";
import { TOKEN } from "./look";
import Rich from "./Rich";

// The controls a journey asks with, on the page: tinted fields with a rule
// under them, options as chips (or rows, when they carry a hint), a stepper
// for counts, a dashed drop zone for a picture.

const INPUT =
  "w-full rounded-t-md border-b-2 border-navy/40 bg-navy/[0.045] px-3 py-2.5 text-[17px] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-meeple focus:bg-white aria-[invalid=true]:border-meeple";

const optionLabel = (o: Option) => o.label ?? o.value;

export function Field({
  q,
  value,
  error,
  onChange,
  onEnter,
  answers = {},
  onExtra,
  boxErrors = {},
}: {
  q: Question;
  value: Answer;
  error?: string;
  onChange: (v: Answer) => void;
  /** Enter in a one-line field moves the journey on. */
  onEnter: () => void;
  /** Every answer so far, for the text boxes under picked options. */
  answers?: Answers;
  /** Sets one of those boxes' answers. */
  onExtra?: (key: string, v: Answer) => void;
  /** Problems with those boxes, by box key. */
  boxErrors?: Record<string, string>;
}) {
  const id = useId();
  const helpId = `${id}-help`;
  const errId = `${id}-err`;
  const describedBy =
    [q.help && helpId, error && errId].filter(Boolean).join(" ") || undefined;
  const title = (
    <>
      {q.label}
      {q.required && (
        <span aria-hidden className="ml-1 text-meeple">
          *
        </span>
      )}
      {q.aside && (
        <span className="ml-2 text-[16px] font-normal text-ink/55">
          (<Rich text={q.aside} />)
        </span>
      )}
    </>
  );
  const help = q.help && (
    <p
      id={helpId}
      className="mt-1.5 max-w-[42em] text-[16px] leading-snug text-ink/65"
    >
      <Rich text={q.help} />
    </p>
  );
  const err = error && (
    <p id={errId} className="mt-2 text-sm font-semibold text-meeple">
      {error}
    </p>
  );
  const shared = {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": q.required || undefined,
  };

  if (q.type === "choice" || q.type === "choices" || q.type === "toggle") {
    return (
      <fieldset data-field={q.key} aria-describedby={describedBy}>
        <legend className="text-[20px] font-semibold text-navy">{title}</legend>
        {help}
        {q.type === "toggle" ? (
          <Toggle text={q.text} on={value === true} onChange={onChange} />
        ) : (
          <Options q={q} value={value} onChange={onChange} name={id} />
        )}
        {optionBoxes(q, { ...answers, [q.key]: value })
          .filter((b) => b.open)
          .map((b) => (
            <MoreBox
              key={b.key}
              boxKey={b.key}
              label={b.label}
              placeholder={b.placeholder}
              input={b.input}
              value={answers[b.key]}
              error={boxErrors[b.key]}
              onChange={(v) => onExtra?.(b.key, v)}
            />
          ))}
        {err}
      </fieldset>
    );
  }

  let control: ReactNode;
  const text = typeof value === "string" ? value : "";
  if (q.type === "longtext") {
    control = (
      <>
        <textarea
          id={id}
          rows={4}
          value={text}
          placeholder={q.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onEnter();
            }
          }}
          className={cn(INPUT, "min-h-28 resize-y leading-relaxed")}
          {...shared}
        />
        {q.max && (
          <p
            aria-hidden
            className={cn(
              "mt-1 text-right font-space-mono text-[11px] tracking-[0.06em]",
              text.trim().length > q.max ? "text-meeple" : "text-ink/45",
            )}
          >
            {text.trim().length} / {q.max}
          </p>
        )}
      </>
    );
  } else if (q.type === "number") {
    control = (
      <Stepper
        id={id}
        q={q}
        text={text}
        onChange={onChange}
        onEnter={onEnter}
        shared={shared}
      />
    );
  } else if (q.type === "file") {
    control = <FilePicker q={q} value={value} onChange={onChange} />;
  } else {
    control = (
      <input
        id={id}
        type={
          q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"
        }
        value={text}
        placeholder={q.placeholder}
        autoComplete={q.autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
        className={INPUT}
        {...shared}
      />
    );
  }

  // A column, so fields sharing a row keep their controls on one line.
  return (
    <div data-field={q.key} className="flex flex-col">
      {q.type === "file" ? (
        <p className="text-[20px] font-semibold text-navy">{title}</p>
      ) : (
        <label
          htmlFor={id}
          className="block text-[20px] font-semibold text-navy"
        >
          {title}
        </label>
      )}
      {help}
      <div className="mt-auto pt-3">{control}</div>
      {err}
    </div>
  );
}

// Chips for short options; rows for options with a hint to read. Single
// choices that aren't required can be clicked again to clear.
function Options({
  q,
  value,
  onChange,
  name,
}: {
  q: Extract<Question, { type: "choice" | "choices" }>;
  value: Answer;
  onChange: (v: Answer) => void;
  name: string;
}) {
  const multi = q.type === "choices";
  const chosen = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  const flip = (v: string) => {
    if (multi)
      onChange(
        chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v],
      );
    else onChange(v);
  };
  const clear = (v: string) => {
    if (!multi && !q.required && chosen.includes(v)) onChange(undefined);
  };
  const list = q.layout === "list";

  return (
    <div
      className={
        list ? "mt-3 border-b border-navy/15" : "mt-3 flex flex-wrap gap-2"
      }
    >
      {q.options.map((o) => {
        const on = chosen.includes(o.value);
        const glyphStyle = {
          "--glyph-bg": on ? "var(--color-navy)" : "var(--background)",
        } as CSSProperties;
        const input = (
          <input
            type={multi ? "checkbox" : "radio"}
            name={name}
            value={o.value}
            checked={on}
            onChange={() => flip(o.value)}
            onClick={() => clear(o.value)}
            className="sr-only"
          />
        );
        if (list)
          return (
            <label
              key={o.value}
              className={cn(
                "group flex cursor-pointer items-start gap-3 border-t border-navy/15 px-1 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-meeple",
                on ? "bg-tan/20" : "hover:bg-navy/[0.03]",
              )}
            >
              {input}
              <span
                aria-hidden
                className={cn(
                  TOKEN,
                  "mt-0.5 size-6 border-2 transition-colors",
                  multi && "rounded-md",
                  on
                    ? "border-navy bg-navy text-cream"
                    : "border-navy/35 group-hover:border-navy",
                )}
              >
                {on && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              {o.glyph && (
                <Glyph
                  name={o.glyph}
                  className="mt-0.5 size-6 shrink-0 text-navy"
                />
              )}
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold text-navy">
                  {optionLabel(o)}
                </span>
                {o.hint && (
                  <span className="mt-0.5 block text-[14.5px] leading-snug text-ink/60">
                    {o.hint}
                  </span>
                )}
              </span>
            </label>
          );
        return (
          <label
            key={o.value}
            // The card-games glyph's front card fills to match the chip.
            style={glyphStyle}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border-2 px-3.5 py-2 text-[15px] font-semibold transition-[background-color,border-color,color,translate] duration-150 select-none active:translate-y-px has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-meeple has-[:focus-visible]:ring-offset-2",
              on
                ? "border-navy bg-navy text-cream"
                : "border-navy/20 text-navy hover:-translate-y-0.5 hover:border-navy",
            )}
          >
            {input}
            {o.glyph && <Glyph name={o.glyph} className="size-5 shrink-0" />}
            {multi && on && !o.glyph && (
              <Check aria-hidden className="size-4" strokeWidth={3} />
            )}
            <span>{optionLabel(o)}</span>
          </label>
        );
      })}
    </div>
  );
}

// The box an option like "Other" opens, tucked under the options: a couple
// of lines, or one line for an email. A pick that opens it puts the cursor
// straight in.
function MoreBox({
  boxKey,
  label,
  placeholder,
  input,
  value,
  error,
  onChange,
}: {
  boxKey: string;
  label: string;
  placeholder?: string;
  input?: "email";
  value: Answer;
  error?: string;
  onChange: (v: Answer) => void;
}) {
  const id = useId();
  const box = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!box.current?.value) box.current?.focus({ preventScroll: true });
  }, []);
  const shared = {
    id,
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      box.current = el;
    },
    value: typeof value === "string" ? value : "",
    placeholder,
    maxLength: MORE_MAX,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    "aria-invalid": error ? true : undefined,
  };
  return (
    <div
      data-field={boxKey}
      className="mt-4 animate-in border-l-2 border-tan pl-4 duration-300 fade-in slide-in-from-top-1"
    >
      <label htmlFor={id} className="block text-[15px] font-semibold text-navy">
        {label}
      </label>
      {input === "email" ? (
        <input
          type="email"
          autoComplete="email"
          className={cn(INPUT, "mt-2")}
          {...shared}
        />
      ) : (
        <textarea
          rows={2}
          className={cn(INPUT, "mt-2 min-h-16 resize-y leading-relaxed")}
          {...shared}
        />
      )}
      {error && (
        <p className="mt-2 text-sm font-semibold text-meeple">{error}</p>
      )}
    </div>
  );
}

function Toggle({
  text,
  on,
  onChange,
}: {
  text: string;
  on: boolean;
  onChange: (v: Answer) => void;
}) {
  return (
    <label className="group mt-3 flex cursor-pointer items-start gap-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-meeple has-[:focus-visible]:ring-offset-4">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          TOKEN,
          "mt-0.5 size-7 rounded-md border-2 border-navy transition-[background-color,rotate] duration-200",
          on ? "-rotate-6 bg-navy text-cream" : "group-hover:bg-navy/5",
        )}
      >
        {on && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="max-w-[40em] text-[16px] leading-snug text-ink/85">
        {text}
      </span>
    </label>
  );
}

function Stepper({
  id,
  q,
  text,
  onChange,
  onEnter,
  shared,
}: {
  id: string;
  q: Extract<Question, { type: "number" }>;
  text: string;
  onChange: (v: Answer) => void;
  onEnter: () => void;
  shared: Record<string, unknown>;
}) {
  const n = Number(text);
  const bump = (by: number) => {
    const from =
      text.trim() && Number.isFinite(n) ? n : (q.min ?? 0) - (by > 0 ? by : 0);
    let to = Math.round((from + by) * 10) / 10;
    if (q.min != null) to = Math.max(q.min, to);
    if (q.max != null) to = Math.min(q.max, to);
    onChange(String(to));
  };
  const BUTTON =
    "grid size-11 shrink-0 place-items-center rounded-full border-2 border-navy text-navy transition-colors hover:bg-navy hover:text-cream disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy";
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={!text.trim() || (q.min != null && n <= q.min)}
        aria-label="One fewer"
        className={BUTTON}
      >
        <Minus className="size-5" />
      </button>
      <input
        id={id}
        inputMode={q.decimals ? "decimal" : "numeric"}
        value={text}
        placeholder={q.placeholder ?? "–"}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
        className={cn(INPUT, "w-24 text-center text-[22px] font-semibold")}
        {...shared}
      />
      <button
        type="button"
        onClick={() => bump(1)}
        disabled={q.max != null && n >= q.max}
        aria-label="One more"
        className={BUTTON}
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}

// Pictures are shrunk in the browser before they're sent: a profile picture
// doesn't need more than 1200px, and it keeps the upload small.
async function shrink(file: File, max = 1200): Promise<FileAnswer> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode"))),
      "image/jpeg",
      0.85,
    ),
  );
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return {
    name: `${file.name.replace(/\.[^.]+$/, "") || "picture"}.jpg`,
    type: "image/jpeg",
    size: blob.size,
    data,
  };
}

function FilePicker({
  q,
  value,
  onChange,
}: {
  q: Extract<Question, { type: "file" }>;
  value: Answer;
  onChange: (v: Answer) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const file =
    value && typeof value === "object" && !Array.isArray(value) ? value : null;

  const take = async (f: File | undefined) => {
    if (!f) return;
    setProblem(null);
    if (!f.type.startsWith("image/")) {
      setProblem("That's not a picture. Try a JPG, PNG or WebP.");
      return;
    }
    setBusy(true);
    try {
      onChange(await shrink(f));
    } catch {
      setProblem("Couldn't read that picture. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  };

  if (file)
    return (
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
        <img
          src={`data:${file.type};base64,${file.data}`}
          alt="Your picture"
          className="size-24 -rotate-2 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-navy">
            {file.name}
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink/60 underline underline-offset-2 hover:text-meeple"
          >
            <X aria-hidden className="size-3.5" />
            Remove
          </button>
        </div>
      </div>
    );

  return (
    <>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void take(e.dataTransfer.files[0]);
        }}
        className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl px-6 py-8 text-center outline-2 -outline-offset-2 outline-navy/30 transition-[outline-color,background-color] outline-dashed hover:bg-navy/[0.03] hover:outline-navy has-[:focus-visible]:outline-meeple"
      >
        <input
          type="file"
          accept={q.accept.join(",")}
          onChange={(e) => void take(e.target.files?.[0])}
          className="sr-only"
        />
        <ImagePlus
          aria-hidden
          className="size-8 text-navy transition-transform group-hover:-rotate-6"
        />
        <span className="text-[15px] font-semibold text-navy">
          {busy ? "Reading it…" : "Drop a picture here, or click to choose one"}
        </span>
        <span className="text-sm text-ink/55">JPG, PNG or WebP</span>
      </label>
      {problem && (
        <p className="mt-2 text-sm font-semibold text-meeple">{problem}</p>
      )}
    </>
  );
}
