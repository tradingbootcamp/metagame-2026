"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/v2/components/ui/dialog";
import { getServerSnapshot, getSnapshot, subscribe } from "@/v2/puzzle/store";

// Crops of the 2560×1928 library photo, as background size and position. The
// box back shows the cubby shelf at 16:10, so the changing cubby reads at a
// glance; the enlargement shows a little more at 4:3, big enough to read the
// win image's sign.
const CROP: CSSProperties = {
  aspectRatio: "16 / 10",
  backgroundSize: "208%",
  backgroundPosition: "99% 66%",
};
const ZOOM: CSSProperties = {
  aspectRatio: "4 / 3",
  backgroundSize: "200%",
  backgroundPosition: "100% 69%",
};

// The cover puzzle (src/v2/puzzle) as the box back's product photo: the game
// library at Lighthaven, whose one changing cubby names the current game. The
// boot script sets the image as --puzzle-image on <html> before first paint,
// so this renders without client state; a right guess on a chapter rule
// swaps it, and the last one brings up the win image. "Contents may vary" is
// the only hint, as on any game box.
export default function ShelfFigure() {
  const { current } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const photo = (crop: CSSProperties) => (
    <div
      key={current}
      aria-hidden
      className="w-full animate-in bg-no-repeat duration-500 fade-in"
      style={{ backgroundImage: "var(--puzzle-image)", ...crop }}
    />
  );
  return (
    <figure>
      <Dialog>
        <DialogTrigger
          aria-label="See the game library photo larger"
          className="block w-full cursor-zoom-in overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-2"
        >
          {photo(CROP)}
        </DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="w-[min(1100px,calc(100vw-1rem),calc((100svh-2rem)*4/3))] max-w-none overflow-hidden border-navy/15 bg-cream p-2"
        >
          <DialogTitle className="sr-only">
            The game library at Lighthaven
          </DialogTitle>
          <DialogDescription className="sr-only">
            The library&apos;s cubby shelf, enlarged.
          </DialogDescription>
          {photo(ZOOM)}
        </DialogContent>
      </Dialog>
      <figcaption className="mt-2 font-space-mono text-[11px] leading-snug tracking-[0.04em] text-ink/60">
        {current === "win"
          ? "Every game is back. Read the sign on the shelf."
          : "Shown: the game library at Lighthaven. Contents may vary from those shown."}
      </figcaption>
    </figure>
  );
}
