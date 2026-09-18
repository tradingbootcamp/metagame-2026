import Image, { type StaticImageData } from "next/image";
import HatImage from "@/v2/hat-trick/HatImage";
import type { Hat } from "@/v2/hat-trick/hats";
import SnapCarousel from "./SnapCarousel";

// Home-page photo strip.
export default function Carousel({
  images,
}: {
  images: { src: StaticImageData; alt: string; hats?: Hat[] }[];
}) {
  return (
    <div className="mx-auto w-full max-w-[960px] px-8">
      <SnapCarousel
        label="photo"
        peek
        slideClassName="overflow-hidden rounded-2xl"
        className="[&>button]:mx-1"
        slides={images.map(({ src, alt, hats }, i) =>
          hats?.length ? (
            <HatImage
              key={i}
              src={src}
              alt={alt}
              hats={hats}
              className="aspect-[4/3] w-full"
              sizes="(min-width: 960px) 896px, 100vw"
              priority={i === 0}
            />
          ) : (
            <div key={i} className="relative aspect-[4/3] w-full">
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(min-width: 960px) 896px, 100vw"
                className="object-cover"
                priority={i === 0}
              />
            </div>
          ),
        )}
      />
    </div>
  );
}
