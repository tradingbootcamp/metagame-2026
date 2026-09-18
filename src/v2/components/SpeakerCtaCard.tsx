"use client";

import HatPile from "@/v2/hat-trick/HatPile";
import { HAT_TRICK_CODE, HAT_TRICK_TARGET, HATS } from "@/v2/hat-trick/hats";
import { useHatTrick } from "@/v2/hat-trick/store";
import { HEADING } from "./styles";

// The empty seat at the end of the speaker lineup: a silhouette in the same
// footprint as a PersonCard, inviting the reader to propose a session. It's
// also where Hat Trick's hats land: each one grabbed from a photo stacks on
// the silhouette's head, and three of them earn the coupon code.
export default function SpeakerCtaCard({ href }: { href: string }) {
  const { collected } = useHatTrick();
  const worn = collected.map((id) => HATS[id]);
  const done = worn.length >= HAT_TRICK_TARGET;

  // The margin version has room to list the hats; the on-card one doesn't.
  const score = (list: boolean) =>
    worn.length > 0 && (
      <>
        <p className={`${HEADING} text-navy`}>Hat count: {worn.length}</p>
        {list && (
          <ul className="mt-1 text-sm text-ink/70">
            {worn.map((h) => (
              <li key={h.id} className="flex items-center gap-1.5">
                {/* The Crown is the bonus after the three, not a box to tick. */}
                {h.requires?.length ? (
                  <span aria-hidden>&#x1F451;</span>
                ) : (
                  <span aria-hidden className="text-emerald-600">
                    &#10003;
                  </span>
                )}
                {h.name.replace(/ hat$/, "")}
              </li>
            ))}
          </ul>
        )}
        {done && list && (
          <p className="mt-2 text-sm text-ink/70">
            Use coupon code{" "}
            <span className="font-space-mono font-bold text-meeple">
              {HAT_TRICK_CODE}
            </span>{" "}
            for $33 off your ticket price
          </p>
        )}
        {done && !list && (
          <p className="mt-1 font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
            Coupon code:{" "}
            <span className="font-bold text-meeple">{HAT_TRICK_CODE}</span>
          </p>
        )}
      </>
    );

  return (
    <div className="relative h-full">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-dashed border-navy/40 bg-white shadow-[0_8px_24px_rgba(23,48,89,0.08)] transition-[border-color,box-shadow] hover:border-navy hover:shadow-[0_12px_28px_rgba(23,48,89,0.16)]"
      >
        <div
          aria-hidden
          className="relative flex aspect-square w-full items-end justify-center overflow-hidden bg-navy/[0.06]"
        >
          <svg
            viewBox="0 0 100 100"
            className="h-[86%] w-[86%] fill-navy/15 transition-[fill] group-hover:fill-navy/25"
          >
            {/* one cutout: a bob of hair around the head, flowing into the neck, on sloped shoulders */}
            <path d="M50 8c-16 0-23 11-23 24 0 11-1 22-5 30 3 4 12 4 18-1v4c-8 1-20 4-26 11-5 5-7 14-7 24h86c0-10-2-19-7-24-6-7-18-10-26-11v-4c6 5 15 5 18 1-4-8-5-19-5-30 0-13-7-24-23-24z" />
          </svg>
          {/* Score on the chest, below the head, when the page margin beside
              the card is too narrow for it (see the sibling below). */}
          {score(false) && (
            <div className="absolute inset-x-3 top-[82%] text-center text-[15px] 2xl:hidden">
              {score(false)}
            </div>
          )}
        </div>
        <div className="px-4 py-3 text-center">
          <h3 className={`${HEADING} text-lg text-navy`}>You?</h3>
          <p className="mt-1 font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase transition-colors group-hover:text-navy">
            <span className="underline underline-offset-2">
              Submit a proposal &rarr;
            </span>
          </p>
        </div>
      </a>
      {/* The pile lives outside the card's clipped frame, over the same
          square, so a tall stack rises above the card instead of being cut. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 aspect-square"
      >
        <HatPile hats={worn} />
      </div>
      {/* Score beside the card, in the page margin, on wide screens. */}
      {score(true) && (
        <div className="absolute top-0 left-full ml-4 hidden w-36 text-base 2xl:block">
          {score(true)}
        </div>
      )}
    </div>
  );
}
