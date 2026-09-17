// Tells the server a word was cast, so we can see whether anyone finds these.
// Fire-and-forget: nothing here may delay or break an effect.
export type Via = "click" | "type";

// Groups one sitting's casts together and nothing more. Kept in sessionStorage
// so it survives a reload — reloading is how you get a finished rack back, so
// it's part of the same sitting — but not the tab closing, and it's tied to no
// one. Falls back to per-load if storage is unavailable.
const KEY = "scrabble-visit";
let visit: string | undefined;

const visitId = () => {
  if (visit) return visit;
  try {
    visit = sessionStorage.getItem(KEY) ?? undefined;
    if (!visit) {
      visit = Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem(KEY, visit);
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
