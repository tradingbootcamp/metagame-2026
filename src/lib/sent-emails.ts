import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

// The emails we've sent, as the templates saved under emails/ (see its
// CLAUDE.md). Each `.html` is one email; a `.min.html` is the same email
// collapsed for pasting into EmailOctopus and a `.txt` is a plain-text copy.
// Read per request so a merged edit shows without a cache to bust.

export const EMAILS_DIR = path.join(process.cwd(), "emails");

export const EMAIL_VARIANTS = ["html", "min", "txt"] as const;
export type EmailVariant = (typeof EMAIL_VARIANTS)[number];

export type SentEmail = {
  /** The file's base name, which is the URL segment. */
  slug: string;
  /** The HTML's `<title>`, which is the nearest thing to the subject. */
  subject: string;
  bytes: number;
  variants: EmailVariant[];
};

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
export const isEmailSlug = (value: string): boolean => SLUG.test(value);
export const isEmailVariant = (value: unknown): value is EmailVariant =>
  (EMAIL_VARIANTS as readonly unknown[]).includes(value);

const FILE_NAME: Record<EmailVariant, (slug: string) => string> = {
  html: (slug) => `${slug}.html`,
  min: (slug) => `${slug}.min.html`,
  txt: (slug) => `${slug}.txt`,
};

/** Groups a directory listing into one entry per `.html`, with its variants. */
export function groupEmailFiles(
  names: readonly string[],
): { slug: string; variants: EmailVariant[] }[] {
  const set = new Set(names);
  return names
    .filter((n) => n.endsWith(".html") && !n.endsWith(".min.html"))
    .map((n) => n.slice(0, -".html".length))
    .filter(isEmailSlug)
    .sort()
    .map((slug) => ({
      slug,
      variants: EMAIL_VARIANTS.filter((v) => set.has(FILE_NAME[v](slug))),
    }));
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** The `<title>` text, or the slug when the file has none. */
export function emailSubject(html: string, slug: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const text = m?.[1]
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, code: string) => {
      if (code[0] === "#") {
        const n =
          code[1]?.toLowerCase() === "x"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : all;
      }
      return ENTITIES[code.toLowerCase()] ?? all;
    })
    .replace(/\s+/g, " ")
    .trim();
  return text || slug;
}

// EmailOctopus fills these at send time; stand-ins keep the footer legible
// and the links inert in the preview.
const TAGS: Record<string, string> = {
  UnsubscribeURL: "#",
  RewardsURL: "#",
  SenderInfoLine: "Metagame · (sender address filled in by EmailOctopus)",
};

/** The template with its merge tags replaced, for rendering in the catalog. */
export const previewEmail = (source: string): string =>
  source.replace(/\{\{(\w+)\}\}/g, (all, tag: string) => TAGS[tag] ?? all);

export async function listSentEmails(): Promise<SentEmail[]> {
  const names = await readdir(EMAILS_DIR).catch(() => [] as string[]);
  return Promise.all(
    groupEmailFiles(names).map(async ({ slug, variants }) => {
      const file = path.join(EMAILS_DIR, FILE_NAME.html(slug));
      const [html, { size }] = await Promise.all([
        readFile(file, "utf8"),
        stat(file),
      ]);
      return { slug, subject: emailSubject(html, slug), bytes: size, variants };
    }),
  );
}

/** One variant's source, or null when the slug or file doesn't exist. */
export async function readSentEmail(
  slug: string,
  variant: EmailVariant = "html",
): Promise<string | null> {
  if (!isEmailSlug(slug)) return null;
  return readFile(
    path.join(EMAILS_DIR, FILE_NAME[variant](slug)),
    "utf8",
  ).catch(() => null);
}

export async function findSentEmail(slug: string): Promise<SentEmail | null> {
  if (!isEmailSlug(slug)) return null;
  return (await listSentEmails()).find((e) => e.slug === slug) ?? null;
}
