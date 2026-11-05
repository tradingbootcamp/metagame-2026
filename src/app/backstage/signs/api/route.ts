import { put } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";
import { toolAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Shared drafts for the sign maker. Everyone holding misc.signs may list,
// open, save over and delete any draft; created_by / updated_by are credit.
//
//   GET                     list drafts (no sign body)
//   GET ?id=                one draft with its sign
//   POST  application/json  { id?, name, sign, thumbnail? } -> { id }
//   POST  multipart file    upload a photo or font to Blob -> { url }
//   DELETE ?id=

const headers = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });

const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "font/ttf": "ttf",
  "font/otf": "otf",
  "font/woff": "woff",
  "font/woff2": "woff2",
};
// Browsers often send fonts with no or a generic type; go by extension then.
const FONT_EXT = /\.(ttf|otf|woff2?)$/i;

export async function GET(request: Request) {
  if (!(await toolAccess("misc.signs")))
    return json({ error: "Sign in." }, 401);
  const db = getDb();
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const [row] = await db
      .select()
      .from(schema.signDrafts)
      .where(eq(schema.signDrafts.id, id));
    if (!row) return json({ error: "No such draft." }, 404);
    return json({ draft: row });
  }
  const creator = alias(schema.user, "creator");
  const editor = alias(schema.user, "editor");
  const rows = await db
    .select({
      id: schema.signDrafts.id,
      name: schema.signDrafts.name,
      thumbnail: schema.signDrafts.thumbnail,
      createdBy: creator.name,
      updatedBy: editor.name,
      updatedAt: schema.signDrafts.updatedAt,
    })
    .from(schema.signDrafts)
    .leftJoin(creator, eq(creator.id, schema.signDrafts.createdBy))
    .leftJoin(editor, eq(editor.id, schema.signDrafts.updatedBy))
    .orderBy(desc(schema.signDrafts.updatedAt));
  return json({ drafts: rows });
}

export async function POST(request: Request) {
  const access = await toolAccess("misc.signs");
  if (!access) return json({ error: "Sign in." }, 401);
  const type = request.headers.get("content-type") ?? "";

  if (type.startsWith("multipart/form-data")) {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) return json({ error: "No file." }, 400);
    if (file.size > UPLOAD_MAX_BYTES)
      return json({ error: "That file is over 8 MB." }, 413);
    const ext =
      UPLOAD_TYPES[file.type] ?? file.name.match(FONT_EXT)?.[1]?.toLowerCase();
    if (!ext) return json({ error: "Use an image or a font file." }, 415);
    const { url } = await put(`signs/${crypto.randomUUID()}.${ext}`, file, {
      access: "public",
      contentType: file.type || undefined,
    });
    return json({ url });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object")
    return json({ error: "Bad body." }, 400);
  const { id, name, sign, thumbnail } = body as {
    id?: unknown;
    name?: unknown;
    sign?: unknown;
    thumbnail?: unknown;
  };
  if (
    typeof name !== "string" ||
    !name.trim() ||
    !sign ||
    typeof sign !== "object"
  )
    return json({ error: "A draft needs a name and a sign." }, 400);
  const thumb =
    typeof thumbnail === "string" && thumbnail.length < 20_000
      ? thumbnail
      : null;
  const db = getDb();
  if (typeof id === "string") {
    const [row] = await db
      .update(schema.signDrafts)
      .set({
        name: name.trim(),
        sign,
        thumbnail: thumb,
        updatedBy: access.userId,
      })
      .where(eq(schema.signDrafts.id, id))
      .returning({ id: schema.signDrafts.id });
    if (row) return json({ id: row.id });
  }
  const [row] = await db
    .insert(schema.signDrafts)
    .values({
      name: name.trim(),
      sign,
      thumbnail: thumb,
      createdBy: access.userId,
      updatedBy: access.userId,
    })
    .returning({ id: schema.signDrafts.id });
  return json({ id: row.id });
}

export async function DELETE(request: Request) {
  if (!(await toolAccess("misc.signs")))
    return json({ error: "Sign in." }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Which draft?" }, 400);
  await getDb().delete(schema.signDrafts).where(eq(schema.signDrafts.id, id));
  return json({ ok: true });
}
