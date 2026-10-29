"use client";

import { useEffect } from "react";

// A tab left open across a deploy can end up asking for a chunk that no
// longer exists (skew protection covers this for 12h; after that, or if it
// misses, the request 404s and React throws here). One reload picks up the
// current build; the sessionStorage flag stops a loop if it doesn't.
const RELOADED_KEY = "chunk-reload";

function isStaleChunkError(error: Error) {
  return (
    error.name === "ChunkLoadError" ||
    /Loading (CSS )?chunk|Failed to fetch dynamically imported module|Importing a module script failed/.test(
      error.message,
    )
  );
}

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isStaleChunkError(error)) {
      try {
        sessionStorage.removeItem(RELOADED_KEY);
      } catch {}
      return;
    }
    try {
      if (sessionStorage.getItem(RELOADED_KEY)) return;
      sessionStorage.setItem(RELOADED_KEY, "1");
    } catch {
      // Storage blocked: still reload; a loop would need a second throw.
    }
    window.location.reload();
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-ink">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-balance">
        The site may have just been updated. Reloading usually fixes it.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-ink px-4 py-2 text-background"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-ink px-4 py-2"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
