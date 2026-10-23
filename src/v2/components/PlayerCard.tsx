import Image from "next/image";
import Link from "next/link";
import type { Person } from "@/v2/data/team";
import HatImage from "@/v2/hat-trick/HatImage";
import { DISPLAY, PLAYER_PHOTO } from "./styles";

// One speaker in the rulebook's §5 Players: the brand mock's compact card
// (name, affiliation, session) with the photo as a square beside the text,
// so the card stays the mock's height.
export default function PlayerCard({
  name,
  title,
  titleUrl,
  photo,
  hats,
  session,
}: Person) {
  return (
    <div className="flex h-full gap-3 rounded-xl border-2 border-navy bg-white p-3 transition-[translate,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[4px_4px_0_0_var(--color-navy)]">
      {photo && hats?.length ? (
        <HatImage
          src={photo}
          alt={name}
          hats={hats}
          className={PLAYER_PHOTO}
          sizes="144px"
        />
      ) : photo ? (
        <Image
          src={photo}
          alt={name}
          className={`${PLAYER_PHOTO} object-cover`}
          sizes="144px"
        />
      ) : (
        <div
          aria-hidden
          className={`${PLAYER_PHOTO} ${DISPLAY} grid place-items-center bg-navy text-3xl text-cream`}
        >
          {name
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <h3
          className={`${DISPLAY} text-2xl leading-none tracking-[0.02em] text-navy`}
        >
          {name}
        </h3>
        <p className="font-space-mono text-[11px] tracking-[0.08em] break-words text-ink/60 uppercase">
          {titleUrl ? (
            <a
              href={titleUrl}
              {...(titleUrl.startsWith("/")
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="underline underline-offset-2 transition-colors hover:text-navy"
            >
              {title}
            </a>
          ) : (
            title
          )}
        </p>
        {session && (
          <p className="mt-0.5 text-sm leading-snug text-ink/80 italic">
            {session.slug ? (
              <Link
                href={`/schedule/${session.slug}`}
                className="underline-offset-2 hover:text-navy hover:underline"
              >
                {session.title}
              </Link>
            ) : (
              session.title
            )}
          </p>
        )}
      </div>
    </div>
  );
}
