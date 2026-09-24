// CRAB: the whole rack is the crab's shell. Three stout legs off each end, a
// big pincer raised off each top corner and a pair of eye stalks, drawn in px over
// the rack (`width` × `height`, `pad` in from the plate's edges). `ferris`
// is RUST's: a domed shell rises up behind the rack, spiked along its rim,
// and the stalks go, for Ferris's round white eyes up on the dome.
export default function Crab({
  width,
  height,
  pad,
  gaps,
  color,
  wait,
  ferris = false,
}: {
  width: number;
  height: number;
  pad: [x: number, y: number];
  gaps: [x: number, width: number][];
  color: string;
  wait: number; // ms before the scuttle starts
  ferris?: boolean;
}) {
  const [px, py] = pad;
  const floor = py + height + 13;
  const ends = [
    [px + 2, -1],
    [px + width - 2, 1],
  ];
  return (
    <>
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
        {ferris && (
          <>
            <path
              d={dome(px, py, width, py + height)}
              fill={color}
              stroke="none"
            />
          </>
        )}
        {ends.flatMap(([x, side]) => {
          // The claw: a fat pincer held up and out on a short arm — a disc with
          // a wedge bitten out of the side facing away from the body.
          // Ferris's arms come off his sides and point down and in, the claws
          // held under his belly, open towards the middle.
          const [cx, cy, r] = ferris
            ? [x - side * 38, py + height + 11, 10]
            : [x + side * 17, py - 9, 10.5];
          const [jawFrom, jawTo] = ferris ? [108, 178] : [-62, -18];
          const shoulder = ferris
            ? [x + side * 2, py + height - 12]
            : [x - side * 3, py + 4];
          const jaw = (deg: number) => {
            const a = ((side < 0 ? 180 - deg : deg) * Math.PI) / 180;
            return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
          };
          const legs = ferris
            ? // Ferris: two legs a side, each out and down from under his
              // lower edge to a knee, then bent in to a point.
              [0, 1].map((n) => {
                const hip = [x + side * (2 - n * 14), py + height - 4];
                const knee = [hip[0] + side * 9, hip[1] + 13];
                const tip = [knee[0] - side * (17 - n * 3), knee[1] + 12];
                // The knee's two corners straddle the shin, so it keeps its
                // width round the bend.
                const bend = [side * 2.2, 3.2];
                return (
                  <path
                    key={`leg${side}${n}`}
                    d={`M${hip[0] - side * 6} ${hip[1]}L${knee[0] - bend[0]} ${knee[1] - bend[1]}L${tip[0]} ${tip[1]}L${knee[0] + bend[0]} ${knee[1] + bend[1]}L${hip[0] + side * 6} ${hip[1]}Z`}
                    fill={color}
                    stroke="none"
                    className="scrabble-leg"
                    style={{
                      transformOrigin: "50% 0%",
                      animation: `scrabble-leg-idle 800ms ${-(n * 2 + (side + 1) / 2) * 130}ms ease-in-out infinite alternate, scrabble-leg 240ms ${wait + (n * 2 + (side + 1) / 2) * 40}ms ease-in-out infinite alternate`,
                    }}
                  />
                );
              })
            : // Three short, stout legs a side, each stepping out and then
              // straight down to a point. Long thin ones read as a spider.
              [0, 1, 2].map((n) => {
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
              });
          return [
            ...legs,
            // Arm and pincer together, so he can wave them from the shoulder
            // while he waits.
            <g
              key={`claw${side}`}
              className="scrabble-claw"
              style={
                {
                  transformOrigin: `${shoulder[0]}px ${shoulder[1]}px`,
                  // Ferris's pivot is below the claw, so the swing runs the
                  // other way to still wave outward.
                  "--up": `${side * (ferris ? -14 : -26)}deg`,
                  animation: `scrabble-claw 400ms 500ms ease-in-out 5 alternate both, scrabble-claw-flail ${side < 0 ? 1150 : 1430}ms ${wait + 350}ms ease-in-out infinite`,
                } as React.CSSProperties
              }
            >
              <path
                strokeWidth={ferris ? 7.5 : 5.5}
                d={`M${shoulder[0]} ${shoulder[1]}L${ferris ? `${cx + side * 4} ${cy - 3}` : `${cx - side * 5} ${cy + 5}`}`}
              />
              <path
                stroke="none"
                fill={color}
                d={`M${cx} ${cy}L${jaw(jawFrom)}A${r} ${r} 0 1 ${side < 0 ? 1 : 0} ${jaw(jawTo)}Z`}
              />
            </g>,
          ];
        })}
        {!ferris &&
          [-1, 1].map((side) => {
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
      {ferris && (
        // The face, on its own layer over the tiles: the body draws behind
        // them, and there's no room for it under the dome's peak.
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 size-full animate-[scrabble-entry_500ms_ease-out] overflow-visible"
          fill="#1b1b1b"
        >
          {[-1, 1].map((side) => {
            const x = px + width / 2 + side * 11;
            return (
              // Big black eyes, a highlight up in the corner of each.
              <g key={side}>
                <ellipse cx={x} cy={py - 3} rx="5.6" ry="7" />
                <ellipse
                  cx={x + side * 1.8}
                  cy={py - 6}
                  rx="1.9"
                  ry="2.4"
                  fill="#fff"
                />
              </g>
            );
          })}
          {/* The mouth: a small smile under the eyes. */}
          <path d={`M${px + width / 2 - 4} ${py + 7}q4 4.5 8 0z`} />
        </svg>
      )}
    </>
  );
}

// Ferris's back: the top half of an ellipse the width of the (huddled) rack,
// nearly as tall as it is wide, its rim a saw of spikes foot to foot — each
// tip a point pushed out along the ellipse's normal — and filled down to the
// tiles' tops, so the tiles sit in it.
const SPIKES = 13;
const dome = (px: number, py: number, width: number, floor: number) => {
  const cx = px + width / 2;
  // The ends of the half-ellipse sit on the tiles' bottom edge.
  const cy = floor;
  const rx = width / 2 + 8;
  const ry = floor - py + 20;
  const at = (a: number, out: number) =>
    `${(cx + (rx + out) * Math.cos(a)).toFixed(1)} ${(cy + (ry + out) * Math.sin(a)).toFixed(1)}`;
  const step = Math.PI / SPIKES;
  const spikes = Array.from({ length: SPIKES }, (_, i) => {
    const a = Math.PI + step * i;
    return `L${at(a + step / 2, 8)}L${at(a + step, 0)}`;
  });
  // The belly: a shallow curve down from end to end, not a flat.
  return `M${at(Math.PI, 0)}${spikes.join("")}Q${cx} ${cy + 12} ${at(Math.PI, 0)}Z`;
};
