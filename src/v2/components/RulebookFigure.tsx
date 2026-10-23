import Image, { type StaticImageData } from "next/image";
import type { Hat } from "@/v2/hat-trick/hats";
import HatImage from "@/v2/hat-trick/HatImage";

// A rulebook figure: the photo in a navy frame over a mono "Fig. n" caption.
// Photos with Hat Trick hats keep them (the 4:3 crop matches every hat photo,
// so no hat is cut off). The night tone is for the night-look card.
export default function RulebookFigure({
  fig,
  caption,
  src,
  alt,
  hats,
  sizes = "(min-width: 1024px) 560px, 100vw",
  className = "",
  tone = "day",
}: {
  fig: string;
  caption: React.ReactNode;
  src: StaticImageData;
  alt: string;
  hats?: Hat[];
  sizes?: string;
  className?: string;
  tone?: "day" | "night";
}) {
  const night = tone === "night";
  return (
    <figure
      className={`rounded-[4px] border-2 p-2 ${
        night ? "border-[#2a3470] bg-[#1b2350]" : "border-navy bg-white"
      } ${className}`}
    >
      {hats?.length ? (
        <HatImage
          src={src}
          alt={alt}
          hats={hats}
          className="aspect-[4/3] w-full"
          sizes={sizes}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          className="aspect-[4/3] w-full object-cover"
          sizes={sizes}
        />
      )}
      <figcaption
        className={`mt-2 font-space-mono text-xs leading-[1.45] ${
          night ? "text-[#fff5e6]/60" : "text-ink/60"
        }`}
      >
        <b className={night ? "text-[#59e3b0]" : "text-navy"}>Fig. {fig}</b> ·{" "}
        {caption}
      </figcaption>
    </figure>
  );
}
