// Tells the server a word was cast, so we can see whether anyone finds these.
// Fire-and-forget: nothing here may delay or break an effect.
export type Via = "click" | "type";

// Groups one browser's casts together and nothing more: a random code kept in
// localStorage, so it survives reloads (how you get a finished rack back) and
// return visits (do people come back for more?). It's tied to no one — no name,
// email or IP goes with it. Falls back to per-load if storage is unavailable.
const KEY = "scrabble-visit";
let visit: string | undefined;

const visitId = () => {
  if (visit) return visit;
  try {
    visit = localStorage.getItem(KEY) ?? undefined;
    if (!visit) {
      visit = Math.random().toString(36).slice(2, 8);
      localStorage.setItem(KEY, visit);
    }
  } catch {
    visit ??= Math.random().toString(36).slice(2, 8);
  }
  return visit;
};

export function trackCast(word: string, via: Via) {
  try {
    navigator.sendBeacon(
      "/api/egg",
      new Blob([JSON.stringify({ word, via, visit: visitId() })], {
        type: "application/json",
      }),
    );
  } catch {
    // No beacon support, or blocked: not worth a fallback.
  }
}
