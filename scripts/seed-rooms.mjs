// Adds the 2026 schedule rooms from scripts/data/rooms-2026.json (the Airtable
// "Lighthaven Spaces" rows marked On Schedule). Insert-only, matched on
// airtable_record_id: a room already in the table is left alone, so edits made
// in /admin/schedule survive a re-run. Photos are fetched, shrunk to the same
// 320px WebP the room form makes, and stored in Vercel Blob. Prints what it
// would add; pass --apply to write.
//
//   node scripts/seed-rooms.mjs [--apply]
//
// Needs DATABASE_URL and BLOB_READ_WRITE_TOKEN (from .env.local when unset).
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import sharp from "sharp";

try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local
}

const apply = process.argv.includes("--apply");
const { DATABASE_URL, BLOB_READ_WRITE_TOKEN } = process.env;
if (!DATABASE_URL || !BLOB_READ_WRITE_TOKEN) {
  console.error("DATABASE_URL and BLOB_READ_WRITE_TOKEN are required");
  process.exit(1);
}
console.log(`[seed-rooms] database ${new URL(DATABASE_URL).hostname}`);

const rooms = JSON.parse(
  readFileSync(new URL("./data/rooms-2026.json", import.meta.url), "utf8"),
);
const sql = neon(DATABASE_URL);
const have = new Set(
  (
    await sql`select airtable_record_id from locations where airtable_record_id is not null`
  ).map((r) => r.airtable_record_id),
);

async function thumbnail(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const webp = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize(320, 320, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const { url: stored } = await put(`rooms/${crypto.randomUUID()}.webp`, webp, {
    access: "public",
    contentType: "image/webp",
  });
  return stored;
}

let added = 0;
for (const room of rooms) {
  if (have.has(room.airtableRecordId)) {
    console.log(`  exists  ${room.name}`);
    continue;
  }
  console.log(
    `  ${apply ? "add" : "would add"}  ${room.name}${room.imageUrl ? " (+ photo)" : ""}`,
  );
  if (!apply) continue;
  const thumbnailUrl = room.imageUrl ? await thumbnail(room.imageUrl) : null;
  await sql`
    insert into locations
      (name, capacity, campus_location, display_order, show_in_schedule,
       thumbnail_url, airtable_record_id)
    values
      (${room.name}, ${room.capacity}, ${room.campusLocation},
       ${room.displayOrder}, true, ${thumbnailUrl}, ${room.airtableRecordId})`;
  added++;
}
console.log(
  apply
    ? `[seed-rooms] added ${added}`
    : "[seed-rooms] dry run; pass --apply to write",
);
