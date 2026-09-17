// CRAB: the whole rack is the crab's shell. Three stout legs off each end, a
// big pincer raised off each top corner and a pair of eye stalks, drawn in px over
// the rack (`width` × `height`, `pad` in from the plate's edges).
export default function Crab({
  width,
  height,
  pad,
  gaps,
  color,
  wait,
}: {
  width: number;
  height: number;
  pad: [x: number, y: number];
  gaps: [x: number, width: number][];
  color: string;
  wait: number; // ms before the scuttle starts
}) {
  const [px, py] = pad;
  const floor = py + height + 13;
  const ends = [
    [px + 2, -1],
    [px + width - 2, 1],
  ];
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 size-full animate-[scrabble-entry_500ms_ease-out] overflow-visible"
      stroke={color}
      strokeWidth="4.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* The shell: only between the tiles, so it joins them into one body
          without showing through their punched-out letters. */}
      {gaps.map(([x, w], i) => (
        <rect
          key={i}
          x={x}
          y={py + 6}
          width={w}
          height={height - 12}
          fill={color}
          stroke="none"
        />
      ))}
      {ends.flatMap(([x, side]) => {
        // The claw: a fat pincer held up and out on a short arm — a disc with
        // a wedge bitten out of the side facing away from the body.
        const [cx, cy, r] = [x + side * 17, py - 9, 10.5];
        const jaw = (deg: number) => {
          const a = ((side < 0 ? 180 - deg : deg) * Math.PI) / 180;
          return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
        };
        return [
          // Three short, stout legs a side, each stepping out and then straight
          // down to a point. Long thin ones read as a spider.
          ...[0, 1, 2].map((n) => {
            const out = 2 - n;
            const y = py + 9 + n * 7;
            const knee = [side * (7 + out * 6), y - 5 - out * 2];
            const foot = [side * (10 + out * 8), floor - 4];
            return (
              <path
                key={`leg${side}${n}`}
                d={`M${x} ${y}L${x + knee[0]} ${knee[1]}L${x + foot[0]} ${foot[1]}`}
                className="scrabble-leg"
                style={{
                  transformOrigin: `${side < 0 ? "100%" : "0%"} 30%`,
                  // An idle shuffle while he waits; the run takes over (later
                  // in the list wins) once he sets off.
                  animation: `scrabble-leg-idle 800ms ${-(n * 2 + (side + 1) / 2) * 130}ms ease-in-out infinite alternate, scrabble-leg 240ms ${wait + (n * 2 + (side + 1) / 2) * 40}ms ease-in-out infinite alternate`,
                }}
              />
            );
          }),
          // Arm and pincer together, so he can wave them from the shoulder
          // while he waits.
          <g
            key={`claw${side}`}
            className="scrabble-claw"
            style={
              {
                transformOrigin: `${x - side * 3}px ${py + 4}px`,
                "--up": `${side * -26}deg`,
                animation: `scrabble-claw 400ms 500ms ease-in-out 5 alternate both, scrabble-claw-flail ${side < 0 ? 1150 : 1430}ms ${wait + 350}ms ease-in-out infinite`,
              } as React.CSSProperties
            }
          >
            <path
              strokeWidth="5.5"
              d={`M${x - side * 3} ${py + 4}L${cx - side * 5} ${cy + 5}`}
            />
            <path
              stroke="none"
              fill={color}
              d={`M${cx} ${cy}L${jaw(-62)}A${r} ${r} 0 1 ${side < 0 ? 1 : 0} ${jaw(-18)}Z`}
            />
          </g>,
        ];
      })}
      {[-1, 1].map((side) => {
        const x = px + width / 2 + side * 9;
        return (
          <g key={`eye${side}`}>
            <path d={`M${x} ${py + 1}v-9`} strokeWidth="2.2" />
            <ellipse
              cx={x}
              cy={py - 12}
              rx="3.2"
              ry="4.6"
              fill={color}
              stroke="none"
            />
          </g>
        );
      })}
    </svg>
  );
}
