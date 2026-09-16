import { PartyPopper } from "lucide-react";

type IconProps = { size?: number; strokeWidth?: number; className?: string };

// lucide's popper fires up-right, which the die's isometric face shears to
// straight up; an eighth turn compensates.
// fill-box origin so the spin is about the glyph's own centre whether it's
// rendered inline in HTML or nested on the die's SVG face.
export default function PartyPopperRight(props: IconProps) {
  return (
    <PartyPopper
      {...props}
      style={{
        rotate: "45deg",
        transformBox: "fill-box",
        transformOrigin: "center",
      }}
    />
  );
}
