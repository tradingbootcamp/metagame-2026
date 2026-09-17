// The above-the-fold photo behind the dice (whichever crop the hero puzzle
// picked — src/v2/puzzle), with a cream wash centred on them to mute the
// colours. Values were picked in the (since removed) dev
// backdrop lab at full screen on a 16:9 monitor: peak 0.87, taper 114, zoom
// 1.24.
//
// Sizing is deliberately not `cover`. The photo is 4:3, so cover sizes it by
// width on a 16:9 screen but by height in a half-width window, which zooms
// the crop in hard. Instead the image width is pinned to the viewport
// *height* × the monitor aspect (× zoom), so narrowing the window keeps the
// same scale and vertical crop and just reveals less of the sides.
// `max(100vw, …)` keeps wider-than-16:9 screens covered. The puzzle images
// are crops of the same photo at the same size, so they line up.
const MONITOR_ASPECT = 16 / 9;
const ZOOM = 1.24;
const CREAM = "255, 245, 242";
const WASH_PEAK = 0.65;
const WASH_TAPER = 114; // % of the gradient's farthest-corner radius

export default function HeroBackdrop() {
  return (
    <div
      aria-hidden
      // w-screen centred on the hero: it sits inside main's gutter.
      // --wash-y is the dice's centre: the hero's 12vh top padding plus half
      // the dice stage height (Dice.tsx).
      className="absolute top-0 left-1/2 -z-10 h-[88svh] w-screen -translate-x-1/2 overflow-hidden [--wash-y:calc(12vh+clamp(160px,20vh,220px)/2)] md:[--wash-y:calc(7vh+clamp(330px,38vh,440px)/2)]"
    >
      {/* The puzzle's pick: a CSS variable the boot script sets on <html>
          before first paint (src/v2/puzzle). */}
      <div
        className="absolute inset-0 bg-center bg-no-repeat"
        style={{
          backgroundImage: "var(--puzzle-image)",
          backgroundSize: `calc(max(100vw, 100svh * ${MONITOR_ASPECT}) * ${ZOOM}) auto`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% var(--wash-y), rgba(${CREAM}, ${WASH_PEAK}) 0%, rgba(${CREAM}, 0) ${WASH_TAPER}%)`,
        }}
      />
      {/* Bottom edge dissolves into the page background over the last 5%. */}
      <div className="absolute inset-x-0 bottom-0 h-[5%] bg-linear-to-b from-transparent to-background" />
    </div>
  );
}
