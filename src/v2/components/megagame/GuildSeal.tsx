// The Adventurers Guild's round seal, from Libi's brand pieces (the Guild mark
// in the Photo Brand Elements hub).

const NAVY = "#173059";
const TAN = "#E2A85C";
const ORANGE = "#D8502B";
const CREAM = "#FFFBF2";

// Letters set around a circle, from/to in degrees (0 = top, clockwise); bottom
// arcs read upright.
function Arc({
  text,
  r,
  from,
  to,
  bottom = false,
}: {
  text: string;
  r: number;
  from: number;
  to: number;
  bottom?: boolean;
}) {
  const chars = [...text];
  return chars.map((ch, i) => {
    const a = from + ((to - from) * i) / Math.max(1, chars.length - 1);
    return (
      <text
        key={i}
        x="100"
        y={bottom ? 100 + r : 100 - r}
        transform={`rotate(${a.toFixed(1)} 100 100)`}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {ch}
      </text>
    );
  });
}

export default function GuildSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className}>
      <circle cx="100" cy="100" r="98" fill={NAVY} />
      <circle
        cx="100"
        cy="100"
        r="89"
        fill="none"
        stroke={TAN}
        strokeWidth="3"
      />
      <circle
        cx="100"
        cy="100"
        r="59"
        fill={CREAM}
        stroke={TAN}
        strokeWidth="3"
      />
      <g
        fill={CREAM}
        fontSize="14"
        style={{
          fontFamily: "var(--font-space-mono), monospace",
          fontWeight: 700,
        }}
      >
        <Arc text="ADVENTURERS GUILD" r={74} from={-66} to={66} />
        <Arc text="METAGAME" r={74} from={38} to={-38} bottom />
      </g>
      <circle cx="26" cy="100" r="4" fill={ORANGE} />
      <circle cx="174" cy="100" r="4" fill={ORANGE} />
      <path
        d="M100 74 104 96 126 100 104 104 100 126 96 104 74 100 96 96Z"
        transform="rotate(45 100 100)"
        fill={NAVY}
      />
      <path
        d="M100 50 107 93 150 100 107 107 100 150 93 107 50 100 93 93Z"
        fill={ORANGE}
        stroke={NAVY}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle
        cx="100"
        cy="100"
        r="7"
        fill={CREAM}
        stroke={NAVY}
        strokeWidth="3"
      />
    </svg>
  );
}
