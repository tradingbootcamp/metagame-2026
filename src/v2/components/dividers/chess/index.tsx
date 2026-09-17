import Image from "next/image";
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";
import weirdchess1 from "../../../../../public/images/weirdchess1.png";
import weirdchess2 from "../../../../../public/images/weirdchess2.png";
import weirdchess3 from "../../../../../public/images/weirdchess3.png";
import weirdchess4 from "../../../../../public/images/weirdchess4.png";

// Row of odd chess pieces from the 2025 one-pager. Gallery only — the castling
// row is the mounted "chess" divider.
export default function ChessDivider() {
  return (
    <DividerRow>
      {[weirdchess1, weirdchess2, weirdchess3, weirdchess4].map((piece, i) => (
        <Image
          key={i}
          src={piece}
          alt=""
          aria-hidden
          className={`${GLYPH} object-contain ${SHADOW}`}
        />
      ))}
    </DividerRow>
  );
}
