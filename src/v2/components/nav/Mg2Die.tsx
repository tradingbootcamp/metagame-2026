// Custom home/hero rail glyph: an isometric "MG2" die drawn as a hollow outline
// cube (matching the stroked lucide icons) with its three visible faces reading
// M · G · two-pips for Metagame 2026 (MG2). Cube + seams are stroked; the marks
// are filled dark (like the duck's eye) since stroked letters go illegible at
// icon size. 24×24 + currentColor inherits the rail's weight + resting/active states.
type IconProps = { size?: number; strokeWidth?: number; className?: string };

export const CUBE =
  "M12 4.3 L19.7 8.6 L19.7 17.3 L12 21.6 L4.3 17.3 L4.3 8.6 Z";
export const SEAMS = "M4.3 8.6 L12 13 M19.7 8.6 L12 13 M12 13 L12 21.6";

// Unit-square → face-plane transforms (u across, v down the face).
export const LEFT_FACE = "matrix(7.7,4.3,0,8.6,4.3,8.6)";
export const RIGHT_FACE = "matrix(7.7,-4.3,0,8.6,12,13)";
export const PIPS: [number, number][] = [
  [9.8, 8.3],
  [14.2, 8.9],
];
export const PIP_R = 0.85;
// Face-local letter anchor (centred, central baseline) and em size.
export const LETTER = { x: 0.5, y: 0.56, size: 0.66 };

function FaceLetter({ transform, char }: { transform: string; char: string }) {
  return (
    <g transform={transform}>
      <text
        x={LETTER.x}
        y={LETTER.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="800"
        fontSize={LETTER.size}
        fill="currentColor"
      >
        {char}
      </text>
    </g>
  );
}

export default function Mg2Die({
  size = 22,
  strokeWidth = 2,
  className,
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={className}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={CUBE} />
        <path d={SEAMS} />
      </g>
      {/* top face: two pips */}
      {PIPS.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r={PIP_R} fill="currentColor" />
      ))}
      {/* left + right faces: M, G sheared onto their planes */}
      <FaceLetter transform={LEFT_FACE} char="M" />
      <FaceLetter transform={RIGHT_FACE} char="G" />
    </svg>
  );
}
