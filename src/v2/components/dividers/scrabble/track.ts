// Tells the server a word was cast, so we can see whether anyone finds these.
// Fire-and-forget: nothing here may delay or break an effect.
export type Via = "click" | "type";

// Groups one page load's casts together and nothing more: made fresh each
// load, kept only in memory, tied to no one.
let visit: string | undefined;

export function trackCast(word: string, via: Via) {
  try {
    visit ??= Math.random().toString(36).slice(2, 8);
    navigator.sendBeacon(
      "/api/egg",
      new Blob([JSON.stringify({ word, via, visit })], {
        type: "application/json",
      }),
    );
  } catch {
    // No beacon support, or blocked: not worth a fallback.
  }
}
