import { recordEggCast } from "@/lib/airtable";
import { SPELLS } from "@/v2/components/dividers/scrabble/effects";

// Counts easter-egg casts on the scrabble divider (see track.ts). The client
// fires and forgets, so this never reports failure back: a lost row is fine, a
// console error on someone's page is not. Input is whitelisted because this is
// a public endpoint writing to our base.
export async function POST(request: Request) {
  let body: { word?: unknown; via?: unknown; visit?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const { word, via, visit } = body;
  if (
    typeof word === "string" &&
    Object.hasOwn(SPELLS, word) &&
    (via === "click" || via === "type") &&
    typeof visit === "string" &&
    /^[a-z0-9]{1,12}$/.test(visit)
  ) {
    try {
      await recordEggCast({ word, via, visit });
    } catch (err) {
      console.error("[egg] failed to record cast:", err);
    }
  }
  return new Response(null, { status: 204 });
}
