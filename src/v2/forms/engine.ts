import { cleanDiscordHandle } from "@/lib/discord-handle";
import type { GlyphName } from "@/v2/components/Glyph";

// A journey: one of the site's Airtable forms remade as a page that walks
// through it a step at a time. Each question writes one Airtable field,
// addressed by its field id so a renamed field keeps working; select options
// are written by name, exactly as Airtable spells them. The page (Journey)
// and the submit route (/api/forms/[form]) both run these checks, so a
// submission is validated the same way on both sides.

/** An attached file, read in the browser and sent base64-encoded. */
export type FileAnswer = {
  name: string;
  type: string;
  size: number;
  data: string;
};
export type Answer =
  | string
  | string[]
  | boolean
  | FileAnswer
  | null
  | undefined;
export type Answers = Record<string, Answer>;

/** What a signed-in account knows that a form might ask for. */
export type Prefill = {
  name?: string;
  email?: string;
  discord?: string;
  pronouns?: string;
};

/**
 * Which account detail fills a question before anyone types: a Prefill key,
 * or the Discord handle written as a line of contact info ("Discord @name").
 */
export type FillKey = keyof Prefill | "discordContact";

export type Option = {
  /** What's written to Airtable: the select option's exact name. */
  value: string;
  /** What the page shows, when it differs from the value. */
  label?: string;
  hint?: string;
  glyph?: GlyphName;
  /**
   * Picking this option opens a text box under the question. The table has
   * no field of its own for it, so its answer (kept under `key`) is written
   * into another question's field (`into`, a team-only text question in the
   * same form) as a line headed `label`. An "email" box is one line, and is
   * checked as an address.
   */
  more?: {
    key: string;
    label: string;
    into: string;
    placeholder?: string;
    input?: "email";
  };
};

/** The most a text box under an option takes. */
export const MORE_MAX = 1000;

type Common = {
  key: string;
  /**
   * The Airtable field id the answer is written to. Left out for a question
   * that only shapes the form (a tick that opens another question) and is
   * written nowhere.
   */
  field?: string;
  label: string;
  /** A few words after the label, in parentheses; [words](url) links. */
  aside?: string;
  /** Plain text; [words](url) becomes a link. */
  help?: string;
  required?: boolean;
  /** What to say when it's required and left blank. */
  missing?: string;
  /** Asked only when this returns true. */
  show?: (a: Answers) => boolean;
  /** Questions that share a row sit side by side on a wide screen. */
  row?: string;
  /** Filled in from the signed-in account when the page opens. */
  fill?: FillKey;
};

export type Question =
  | (Common & {
      type: "text" | "email" | "phone";
      placeholder?: string;
      max?: number;
      autoComplete?: string;
    })
  | (Common & { type: "longtext"; placeholder?: string; max?: number })
  | (Common & {
      type: "number";
      min?: number;
      max?: number;
      /** Decimal places allowed (an age like 4.5); whole numbers by default. */
      decimals?: number;
      placeholder?: string;
    })
  | (Common & {
      type: "choice";
      options: Option[];
      /** Written as a one-item list, for a multiple-select field. */
      asList?: boolean;
      /** "list" shows each option on its own line with its hint. */
      layout?: "chips" | "list";
    })
  | (Common & { type: "choices"; options: Option[]; layout?: "chips" | "list" })
  | (Common & { type: "toggle"; text: string })
  | (Common & { type: "file"; accept: string[]; maxBytes: number });

/** Words on the page between questions: context, or a win to celebrate. */
export type Note = {
  type: "note";
  key: string;
  tone?: "info" | "win";
  title?: string;
  body: string;
  cta?: { label: string; href: string };
  show?: (a: Answers) => boolean;
};

export type Item = Question | Note;

export type Step = {
  key: string;
  title: string;
  intro?: string;
  items: Item[];
  show?: (a: Answers) => boolean;
  /**
   * A board that asks some of this step's questions in one picture: the
   * weekend as a calendar to mark, or the volunteer teams to sort. The rest
   * of the step's questions follow it as usual.
   */
  view?: "schedule" | "teams";
};

export type FormDef = {
  /** The submit route's path segment, and the draft's storage key. */
  slug: string;
  /** Where the journey lives on the site. */
  path: string;
  tableId: string;
  /** What the team calls it, for the backup email if Airtable fails. */
  name: string;
  eyebrow: string;
  title: string;
  pitch: string;
  /** One line under the pitch, e.g. how long it takes. */
  aside?: string;
  /** Small facts under the pitch: when it's due, what it costs. */
  facts?: { label: string; value: string }[];
  /** A heads-up under the pitch, e.g. who sees the answers. */
  notice?: string;
  /** A warning under the pitch, with a red mark: a deadline that's passed. */
  warning?: string;
  steps: Step[];
  done: {
    title: string;
    body: string;
    links: { label: string; href: string }[];
  };
  /** Airtable field ids for the visitor's stored UTMs, when the table keeps them. */
  utmFields?: Partial<
    Record<"utm_source" | "utm_medium" | "utm_campaign", string>
  >;
  /**
   * Answers to fill in just before the row is written, from the others: an
   * option the form implies without asking for it.
   */
  beforeWrite?: (a: Answers) => Answers;
};

export const isQuestion = (i: Item): i is Question => i.type !== "note";

export const visibleSteps = (def: FormDef, a: Answers) =>
  def.steps.filter((s) => !s.show || s.show(a));

export const visibleItems = (step: Step, a: Answers) =>
  step.items.filter((i) => !i.show || i.show(a));

export const visibleQuestions = (def: FormDef, a: Answers) =>
  visibleSteps(def, a).flatMap((s) => visibleItems(s, a).filter(isQuestion));

/** Every question in the form, asked or not. */
export const allQuestions = (def: FormDef) =>
  def.steps.flatMap((s) => s.items.filter(isQuestion));

/**
 * The answers an account fills in before anyone types: every question with
 * a `fill`, from what the account knows. Nothing when signed out.
 */
export function prefillAnswers(def: FormDef, from?: Prefill): Answers {
  const a: Answers = {};
  if (!from) return a;
  const discord = cleanDiscordHandle(from.discord);
  for (const q of allQuestions(def)) {
    if (!q.fill) continue;
    const v =
      q.fill === "discordContact"
        ? discord && `Discord @${discord}`
        : q.fill === "discord"
          ? discord
          : from[q.fill]?.trim();
    if (v) a[q.key] = v;
  }
  return a;
}

export const sameAnswer = (a: Answer, b: Answer) =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

/** Same answer under every key either has, in any order. */
export const sameAnswers = (a: Answers, b: Answers) =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) =>
    sameAnswer(a[k], b[k]),
  );

export const isEmpty = (v: Answer) =>
  v == null ||
  v === false ||
  (typeof v === "string" && !v.trim()) ||
  (Array.isArray(v) && !v.length);

/** Whether a choice question has `value` picked (single or multiple). */
export const picked = (v: Answer, value: string) =>
  Array.isArray(v) ? v.includes(value) : v === value;

/** A choice question's options that open a text box, with what's picked. */
export const optionBoxes = (q: Question, a: Answers) =>
  q.type === "choice" || q.type === "choices"
    ? q.options.flatMap((o) =>
        o.more ? [{ ...o.more, open: picked(a[q.key], o.value) }] : [],
      )
    : [];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEXT_MAX = 300;
const LONG_MAX = 5000;

/** What's wrong with an answer, or null when it's fine. */
export function checkAnswer(q: Question, v: Answer): string | null {
  if (isEmpty(v))
    return q.required
      ? (q.missing ??
          (q.type === "toggle" ? "Tick this to go on." : "This one's needed."))
      : null;
  switch (q.type) {
    case "text":
    case "email":
    case "phone":
    case "longtext": {
      if (typeof v !== "string") return "That doesn't look right.";
      const max = q.max ?? (q.type === "longtext" ? LONG_MAX : TEXT_MAX);
      if (v.trim().length > max) return `Keep it under ${max} characters.`;
      if (q.type === "email" && !EMAIL.test(v.trim()))
        return "That email doesn't look right.";
      if (q.type === "phone" && v.replace(/\D/g, "").length < 7)
        return "That number looks too short.";
      return null;
    }
    case "number": {
      const s = typeof v === "string" ? v.trim() : "";
      const places = q.decimals ?? 0;
      const shape = places
        ? new RegExp(`^\\d+(\\.\\d{1,${places}})?$`)
        : /^\d+$/;
      if (!shape.test(s))
        return places ? "A number, please." : "A whole number, please.";
      const n = Number(s);
      if (q.min != null && n < q.min) return `At least ${q.min}.`;
      if (q.max != null && n > q.max) return `At most ${q.max}.`;
      return null;
    }
    case "choice":
      return typeof v === "string" && q.options.some((o) => o.value === v)
        ? null
        : "Pick one of these.";
    case "choices":
      return Array.isArray(v) &&
        v.every((x) => q.options.some((o) => o.value === x))
        ? null
        : "Pick from these.";
    case "toggle":
      return typeof v === "boolean" ? null : "That doesn't look right.";
    case "file": {
      if (
        typeof v !== "object" ||
        v === null ||
        Array.isArray(v) ||
        typeof v.data !== "string" ||
        typeof v.type !== "string"
      )
        return "That file didn't come through.";
      if (!q.accept.includes(v.type)) return "That kind of file won't work.";
      // Base64 runs a third longer than the file it encodes.
      if (v.size > q.maxBytes || v.data.length > (q.maxBytes * 4) / 3 + 4)
        return "That file's too big.";
      return null;
    }
  }
}

/**
 * Problems with the answers on one step, keyed by question, or by the box
 * under an option when an email there isn't one.
 */
export function checkStep(step: Step, a: Answers): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const q of visibleItems(step, a).filter(isQuestion)) {
    const e = checkAnswer(q, a[q.key]);
    if (e) errors[q.key] = e;
    for (const box of optionBoxes(q, a)) {
      const text = a[box.key];
      if (
        box.open &&
        box.input === "email" &&
        typeof text === "string" &&
        text.trim() &&
        !EMAIL.test(text.trim())
      )
        errors[box.key] = "That email doesn't look right.";
    }
  }
  return errors;
}

/** Problems with every question the answers make visible. */
export function checkForm(def: FormDef, a: Answers): Record<string, string> {
  return Object.assign({}, ...visibleSteps(def, a).map((s) => checkStep(s, a)));
}

/**
 * The Airtable row for a set of answers: field id → value, for the questions
 * those answers make visible. Files aren't included; they're uploaded to the
 * row once it exists.
 */
export function airtableFields(
  def: FormDef,
  a: Answers,
): Record<string, string | number | boolean | string[]> {
  const fields: Record<string, string | number | boolean | string[]> = {};
  if (def.beforeWrite) a = def.beforeWrite(a);
  for (const q of visibleQuestions(def, a)) {
    const v = a[q.key];
    if (isEmpty(v) || q.type === "file" || !q.field) continue;
    if (q.type === "number") fields[q.field] = Number(String(v).trim());
    else if (q.type === "toggle") fields[q.field] = true;
    else if (q.type === "choices") fields[q.field] = v as string[];
    else if (q.type === "choice" && q.asList) fields[q.field] = [v as string];
    else fields[q.field] = String(v).trim();
  }
  // Text from an option's own box joins the field it names, after whatever
  // was answered there.
  for (const q of visibleQuestions(def, a))
    for (const box of optionBoxes(q, a)) {
      const text = a[box.key];
      const into = allQuestions(def).find((t) => t.key === box.into);
      if (!box.open || !into?.field || typeof text !== "string" || !text.trim())
        continue;
      const line = `${box.label}: ${text.trim().slice(0, MORE_MAX)}`;
      const before = fields[into.field];
      fields[into.field] =
        typeof before === "string" && before ? `${before}\n\n${line}` : line;
    }
  return fields;
}

/** The file questions, among those asked, that have a file attached. */
export const attachedFiles = (def: FormDef, a: Answers) =>
  visibleQuestions(def, a).filter(
    (q) => q.type === "file" && !isEmpty(a[q.key]),
  );

/** An answer in words: option labels, "Yes" for a tick, a file's name. */
export function answerWords(q: Question, v: Answer): string {
  if (isEmpty(v)) return "";
  if (q.type === "toggle") return "Yes";
  if (q.type === "file")
    return v && typeof v === "object" && !Array.isArray(v) ? v.name : "";
  if (q.type === "choice" || q.type === "choices") {
    const label = (x: string) =>
      q.options.find((o) => o.value === x)?.label ?? x;
    return Array.isArray(v) ? v.map(label).join(", ") : label(String(v));
  }
  return String(v).trim();
}

/** What was written in the text boxes under a question's picked options. */
export const boxWords = (q: Question, a: Answers) =>
  optionBoxes(q, a)
    .filter((b) => b.open && typeof a[b.key] === "string")
    .map((b) => ({ label: b.label, text: String(a[b.key]).trim() }))
    .filter((b) => b.text)
    .map((b) => `${b.label}: ${b.text}`)
    .join("\n");

/**
 * Every question the answers make visible and fill, as label and words, with
 * what its option boxes say.
 */
export const answerSheet = (def: FormDef, a: Answers) =>
  visibleQuestions(def, a)
    .filter((q) => !isEmpty(a[q.key]))
    .map((q) => ({
      label: q.label,
      value: [answerWords(q, a[q.key]), boxWords(q, a)]
        .filter(Boolean)
        .join("\n"),
    }));

/** The first email address the answers give, to reply to. */
export const answeredEmail = (def: FormDef, a: Answers) => {
  const q = visibleQuestions(def, a).find(
    (q) => q.type === "email" && !isEmpty(a[q.key]),
  );
  return q ? String(a[q.key]).trim() : undefined;
};

/**
 * Keep only answers of a shape some question could hold, for the questions
 * this form has. The route runs it on whatever the browser sent.
 */
export function cleanAnswers(def: FormDef, raw: unknown): Answers {
  const answers: Answers = {};
  if (!raw || typeof raw !== "object") return answers;
  const input = raw as Record<string, unknown>;
  for (const q of allQuestions(def)) {
    for (const box of optionBoxes(q, {})) {
      const text = input[box.key];
      if (typeof text === "string") answers[box.key] = text.slice(0, MORE_MAX);
    }
    const v = input[q.key];
    if (typeof v === "string" || typeof v === "boolean") answers[q.key] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "string"))
      answers[q.key] = v;
    else if (
      q.type === "file" &&
      v &&
      typeof v === "object" &&
      typeof (v as FileAnswer).data === "string"
    ) {
      const f = v as FileAnswer;
      answers[q.key] = {
        name: String(f.name ?? "upload").slice(0, 120),
        type: String(f.type ?? ""),
        size: Number(f.size) || 0,
        data: f.data,
      };
    }
  }
  return answers;
}
