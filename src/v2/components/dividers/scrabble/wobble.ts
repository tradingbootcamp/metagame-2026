// WARP / ACID: push an element's pixels around with a noise field (an SVG
// turbulence → displacement filter), swelling to `peak` px and back over `ms`.
// The noise drifts as it goes, which is what makes it swim rather than just
// smear. Everything is torn down at the end. With `inView`, only the part of
// the element on screen is filtered — a whole long page per frame is too much.
let count = 0;

export function wobble(
  el: HTMLElement,
  {
    ms,
    peak,
    grain,
    inView = false,
  }: {
    ms: number;
    peak: number;
    grain: number; // noise frequency: small is big lazy waves, large is jitter
    inView?: boolean;
  },
) {
  const NS = "http://www.w3.org/2000/svg";
  const id = `scrabble-wobble-${++count}`;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0";
  svg.innerHTML = `<filter id="${id}" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" numOctaves="2" seed="${count}" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  document.body.append(svg);
  const filter = svg.querySelector("filter")!;
  const [noise, shift] = [filter.children[0], filter.children[1]];
  if (!inView)
    // Room for the displaced pixels to land outside the element's own box.
    for (const [k, v] of [
      ["x", "-40%"],
      ["y", "-150%"],
      ["width", "180%"],
      ["height", "400%"],
    ])
      filter.setAttribute(k, v);
  else filter.setAttribute("filterUnits", "userSpaceOnUse");

  const before = el.style.filter;
  el.style.filter = `url(#${id})`;
  const start = performance.now();
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    el.style.filter = before;
    svg.remove();
  };
  const tick = (now: number) => {
    const p = (now - start) / ms;
    if (p >= 1) return stop();
    if (inView) {
      const box = el.getBoundingClientRect();
      filter.setAttribute("x", String(-box.left));
      filter.setAttribute("y", String(-box.top));
      filter.setAttribute("width", String(window.innerWidth));
      filter.setAttribute("height", String(window.innerHeight));
    }
    const t = (now - start) / 1000;
    noise.setAttribute(
      "baseFrequency",
      `${grain * (1 + 0.25 * Math.sin(t * 1.3))} ${grain * (1 + 0.25 * Math.cos(t * 0.9))}`,
    );
    shift.setAttribute("scale", String(peak * Math.sin(Math.PI * p) ** 1.5));
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return stop;
}
