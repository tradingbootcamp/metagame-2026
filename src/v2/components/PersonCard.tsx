import Image from "next/image";
import type { Person } from "@/v2/data/team";
import ContactLink from "./contact/ContactLink";
import { HEADING } from "./styles";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// One team member: the photo *is* the card — full-bleed portrait on top, a
// slim caption strip below. `compact` is the home page's mini carousel.
export default function PersonCard({
  name,
  title,
  titleUrl,
  photo,
  email,
  compact = false,
}: Person & { compact?: boolean }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-navy/[0.16] bg-white shadow-[0_8px_24px_rgba(23,48,89,0.08)]">
      {photo ? (
        <Image
          src={photo}
          alt={name}
          className={`w-full object-cover ${compact ? "aspect-square" : "aspect-[4/5]"}`}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
        />
      ) : (
        // Placeholder until there's a photo: initials on navy, same footprint.
        <div
          aria-hidden
          className={`${HEADING} flex w-full items-center justify-center bg-navy text-6xl text-cream ${
            compact ? "aspect-square" : "aspect-[4/5]"
          }`}
        >
          {initials(name)}
        </div>
      )}
      <div className={`text-center ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
        <h3
          className={`${HEADING} text-navy ${compact ? "text-lg" : "text-xl"}`}
        >
          {name}
        </h3>
        <p className="mt-1 font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
          {titleUrl ? (
            <a
              href={titleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-navy"
            >
              {title}
            </a>
          ) : (
            title
          )}
        </p>
        {email && !compact && (
          <ContactLink
            to={email}
            className="mt-2 inline-block text-sm font-semibold text-navy underline underline-offset-2 hover:text-meeple"
          >
            {email}
          </ContactLink>
        )}
      </div>
    </div>
  );
}
