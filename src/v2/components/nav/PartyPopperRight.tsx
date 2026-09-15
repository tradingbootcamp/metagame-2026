import { PartyPopper } from "lucide-react";

type IconProps = { size?: number; strokeWidth?: number; className?: string };

// lucide's popper fires up-right; turned a quarter so it points right.
// fill-box origin so the spin is about the glyph's own centre whether it's
// rendered inline in HTML or nested on the die's SVG face.
export default function PartyPopperRight(props: IconProps) {
  return (
    <PartyPopper
      {...props}
      style={{
        rotate: "90deg",
        transformBox: "fill-box",
        transformOrigin: "center",
      }}
    />
  );
}
