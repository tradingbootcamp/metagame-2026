// DDR divider — the four step arrows, each a solid arrow with an inset ring
// punched out so it reads as the outlined DDR arrow. Drawn here, nothing to
// credit. Not mounted anywhere yet.
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";

const CHARCOAL = "#4d4d4d";
// Up arrow in a 100 box: chevron head, stubby shaft.
const ARROW = "M50 6 L94 50 L70 50 L70 94 L30 94 L30 50 L6 50 Z";
const DIRECTIONS = [
  ["ddr-left", 270],
  ["ddr-down", 180],
  ["ddr-up", 0],
  ["ddr-right", 90],
] as const;

const inset = (k: number) => `translate(50 50) scale(${k}) translate(-50 -50)`;

function Arrow({ name, rotate }: { name: string; rotate: number }) {
  const maskId = `mask-${name}`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${GLYPH} ${SHADOW}`}>
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <path d={ARROW} fill="#fff" />
        <path d={ARROW} transform={inset(0.72)} fill="#000" />
        <path d={ARROW} transform={inset(0.5)} fill="#fff" />
      </mask>
      <g transform={`rotate(${rotate} 50 50)`}>
        <path d={ARROW} fill={CHARCOAL} mask={`url(#${maskId})`} />
      </g>
    </svg>
  );
}

export default function DdrDivider() {
  return (
    <DividerRow>
      {DIRECTIONS.map(([name, rotate]) => (
        <Arrow key={name} name={name} rotate={rotate} />
      ))}
    </DividerRow>
  );
}
