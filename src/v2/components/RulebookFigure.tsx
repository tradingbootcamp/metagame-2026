import Image, { type StaticImageData } from "next/image";
import type { Hat } from "@/v2/hat-trick/hats";
import HatImage from "@/v2/hat-trick/HatImage";

// A rulebook figure: the photo straight on the page over a mono "Fig. n"
// caption. Photos with Hat Trick hats keep them (the 4:3 crop matches every
// hat photo, so no hat is cut off). The night tone is for the Night Market's
// dark band.
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
    <figure className={className}>
      {hats?.length ? (
        <HatImage
          src={src}
          alt={alt}
          hats={hats}
          className="aspect-[4/3] w-full rounded-md"
          sizes={sizes}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          className="aspect-[4/3] w-full rounded-md object-cover"
          sizes={sizes}
        />
      )}
      <figcaption
        className={`mt-2.5 font-space-mono text-xs leading-[1.45] ${
          night ? "text-[#fff5e6]/60" : "text-ink/60"
        }`}
      >
        <b className={night ? "text-[#59e3b0]" : "text-navy"}>Fig. {fig}</b> ·{" "}
        {caption}
      </figcaption>
    </figure>
  );
}
