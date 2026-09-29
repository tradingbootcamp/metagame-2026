// Paper for a win: launched up from a line on screen (viewport px, `bottom`
// its height), arcing as high as `height` above it, then down and gone. Web
// Animations, no library.
const PAPER = ["#d8502b", "#173059", "#f2b134", "#e3d9d4", "#4d4d4d"];
const GRAVITY = 900; // px/s²

export function confetti(
  left: number,
  bottom: number,
  width: number,
  height: number,
) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.style.cssText = `position:fixed;left:${left}px;top:${bottom}px;width:${width}px;height:0;pointer-events:none;z-index:50`;
  document.body.appendChild(layer);
  let longest = 0;
  for (let i = 0; i < 220; i++) {
    const bit = document.createElement("span");
    const w = 5 + Math.random() * 5;
    bit.style.cssText = `position:absolute;left:${Math.random() * width}px;top:0;width:${w}px;height:${w * 1.6}px;background:${PAPER[i % PAPER.length]};border-radius:1px`;
    layer.appendChild(bit);
    // Peak anywhere from a third of the way up to the top.
    const peak = height * (0.33 + Math.random() * 0.72);
    const vy = -Math.sqrt(2 * GRAVITY * peak);
    const vx = (Math.random() - 0.5) * 160;
    const secs = (-2 * vy) / GRAVITY + 0.4;
    const spin = (Math.random() - 0.5) * 1440;
    const sway = 1 + Math.random() * 2;
    const n = 20;
    const frames = Array.from({ length: n }, (_, k) => {
      const t = (k / (n - 1)) * secs;
      const x = vx * t + Math.sin(t * sway * 3) * 12;
      const y = vy * t + (GRAVITY * t * t) / 2;
      return {
        transform: `translate(${x}px, ${y}px) rotate(${spin * t}deg)`,
        opacity: k < n - 5 ? 1 : (n - 1 - k) / 4,
      };
    });
    const delay = Math.random() * 250;
    longest = Math.max(longest, secs * 1000 + delay);
    bit.animate(frames, {
      duration: secs * 1000,
      delay,
      easing: "linear",
      fill: "forwards",
    });
  }
  setTimeout(() => layer.remove(), longest + 100);
}
