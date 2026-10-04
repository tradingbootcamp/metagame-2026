import { Mail } from "lucide-react";
import Image from "next/image";
import { contactEmail } from "@/lib/contact-recipients";
import type { Person } from "@/v2/data/team";
import HatImage from "@/v2/hat-trick/HatImage";
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
  contactKey,
  hats,
  compact = false,
}: Person & { compact?: boolean }) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden border ${compact ? "rounded-2xl" : ""} border-navy/[0.16] bg-white shadow-[0_8px_24px_rgba(23,48,89,0.08)]`}
    >
      {photo && hats?.length ? (
        <HatImage
          src={photo}
          alt={name}
          hats={hats}
          className={`w-full ${compact ? "aspect-square" : "aspect-[4/5]"}`}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 33vw"
        />
      ) : photo ? (
        <Image
          src={photo}
          alt={name}
          className={`w-full object-cover ${compact ? "aspect-square" : "aspect-[4/5]"}`}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 33vw"
        />
      ) : (
        // Placeholder until there's a photo: initials on navy, same footprint.
        <div
          aria-hidden
          className={`${HEADING} flex w-full items-center justify-center bg-navy text-3xl text-cream sm:text-6xl ${
            compact ? "aspect-square" : "aspect-[4/5]"
          }`}
        >
          {initials(name)}
        </div>
      )}
      <div
        className={`flex flex-1 flex-col items-center px-1 py-2 text-center ${compact ? "sm:px-4 sm:py-3" : "sm:px-5 sm:py-4"}`}
      >
        <h3
          className={`${HEADING} text-xs break-words text-navy ${compact ? "sm:text-lg" : "sm:text-xl"}`}
        >
          {name}
        </h3>
        <p className="mt-1 font-space-mono text-[9px] break-words text-ink/60 uppercase sm:text-xs sm:tracking-[0.08em]">
          {titleUrl ? (
            <a
              href={titleUrl}
              {...(titleUrl.startsWith("#")
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
        {contactKey && contactEmail(contactKey) && !compact && (
          <ContactLink
            to={contactKey}
            toName={name.split(" ")[0]}
            className="mt-auto pt-1.5 text-sm font-semibold text-navy underline underline-offset-2 hover:text-meeple sm:pt-2"
          >
            <Mail aria-label={`Email ${name}`} className="size-4 sm:size-5" />
          </ContactLink>
        )}
      </div>
    </div>
  );
}
